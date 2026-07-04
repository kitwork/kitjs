(function (global) {
    const kitmodule = global.kitmodule || (global.kitmodule = {});
    function kitReactive() {
        const bucket = new WeakMap(); // target -> Map(key -> Set(effect))
        let activeEffect = null;
        let shouldTrack = true;

        const jobQueue = new Set();
        let isFlushing = false;
        function schedule(job) {
            jobQueue.add(job);
            if (!isFlushing) {
                isFlushing = true;
                Promise.resolve().then(() => {
                    jobQueue.forEach(fn => fn());
                    jobQueue.clear();
                    isFlushing = false;
                });
            }
        }

        const ITERATE_KEY = Symbol("iterate"); // key special cho vòng lặp array

        // maps để hỗ trợ instrument array
        const originalToProxy = new WeakMap();
        const proxyToRaw = new WeakMap();

        function track(target, key) {
            if (!activeEffect || !shouldTrack) return;
            let depsMap = bucket.get(target);
            if (!depsMap) {
                depsMap = new Map();
                bucket.set(target, depsMap);
            }
            let deps = depsMap.get(key);
            if (!deps) {
                deps = new Set();
                depsMap.set(key, deps);
            }
            if (!deps.has(activeEffect)) {
                deps.add(activeEffect);
                activeEffect.deps.push(deps);
            }
        }

        function trigger(target, key) {
            const depsMap = bucket.get(target);
            if (!depsMap) return;
            const deps = depsMap.get(key);
            if (!deps) return;

            const effectsToRun = new Set(deps);
            effectsToRun.forEach(effectFn => {
                if (effectFn.scheduler) {
                    effectFn.scheduler(effectFn);
                } else {
                    effectFn();
                }
            });
        }

        function cleanup(effectFn) {
            for (const dep of effectFn.deps) {
                dep.delete(effectFn);
            }
            effectFn.deps.length = 0;
        }

        function effect(fn, options = {}) {
            const effectFn = () => {
                cleanup(effectFn);
                activeEffect = effectFn;
                const result = fn();
                activeEffect = null;
                return result;
            };
            effectFn.deps = [];
            effectFn.scheduler = options.scheduler;

            effectFn.cleanup = () => {
                cleanup(effectFn);
            };
            if (!options.lazy) {
                effectFn();
            }
            return effectFn;
        }

        // Instrument một số method của Array để trigger iterate/length khi gọi trực tiếp
        const arrayInstrumentations = Object.create(null);
        ['push', 'pop', 'shift', 'unshift', 'splice', 'sort', 'reverse'].forEach(method => {
            arrayInstrumentations[method] = function (...args) {
                // 'this' sẽ là proxy khi method được gọi từ proxy
                const raw = proxyToRaw.get(this) || this;
                // tạm tắt track để tránh thu thập dependency do các truy cập nội bộ khi chạy method
                shouldTrack = false;
                const res = Array.prototype[method].apply(raw, args);
                shouldTrack = true;

                // Sau khi thay đổi, trigger iterate + length
                trigger(raw, ITERATE_KEY);
                trigger(raw, 'length');
                return res;
            };
        });

        function reactive(obj, cache = new WeakMap()) {
            if (typeof obj !== 'object' || obj === null) return obj;
            // trả lại proxy đã tạo nếu có
            if (originalToProxy.has(obj)) return originalToProxy.get(obj);
            if (cache.has(obj)) return cache.get(obj);

            const proxy = new Proxy(obj, {
                get(target, key, receiver) {
                    // hỗ trợ kiểm tra nhanh
                    if (key === '__isReactive') return true;

                    // nếu là method instrumented (push/pop/...) trả về function đã bind
                    if (Array.isArray(target) && Object.prototype.hasOwnProperty.call(arrayInstrumentations, key)) {
                        return arrayInstrumentations[key].bind(receiver);
                    }

                    const res = Reflect.get(target, key, receiver);

                    // track key truy xuất
                    track(target, key);

                    // nếu là iterator truy xuất (for..of), track iterate key
                    if (Array.isArray(target) && key === Symbol.iterator) {
                        // trả về generator tận dụng target gốc để track từng index
                        return function* () {
                            track(target, ITERATE_KEY);
                            for (let i = 0; i < target.length; i++) {
                                track(target, String(i));
                                yield reactive(target[i], cache);
                            }
                        };
                    }

                    return (typeof res === 'object' && res !== null) ? reactive(res, cache) : res;
                },
                set(target, key, value, receiver) {
                    const oldVal = target[key];
                    const hadKey = Object.prototype.hasOwnProperty.call(target, key);
                    const result = Reflect.set(target, key, value, receiver);

                    if (!hadKey) {
                        // thêm property mới (ví dụ: thêm index mới vào array)
                        trigger(target, ITERATE_KEY);
                    }

                    if (oldVal !== value) {
                        trigger(target, key);

                        // nếu thay đổi length của array → trigger iterate
                        if (Array.isArray(target) && key === 'length') {
                            trigger(target, ITERATE_KEY);
                        }
                    }
                    return result;
                },
                deleteProperty(target, key) {
                    const hadKey = Object.prototype.hasOwnProperty.call(target, key);
                    const result = Reflect.deleteProperty(target, key);
                    if (hadKey) {
                        trigger(target, ITERATE_KEY);
                        trigger(target, key);
                    }
                    return result;
                }
            });

            // ánh xạ hai chiều để instrumentations truy xuất raw từ proxy
            originalToProxy.set(obj, proxy);
            proxyToRaw.set(proxy, obj);
            cache.set(obj, proxy);
            return proxy;
        }

        function computed(getter) {
            let value;
            let dirty = true;
            let dep = new Set(); // chứa các effect phụ thuộc vào computed.value

            const runner = effect(getter, {
                lazy: true,
                scheduler: () => {
                    dirty = true;
                    // thông báo cho các effect đang track computed.value
                    dep.forEach(effectFn => effectFn());
                }
            });

            const computedRef = {
                get value() {
                    if (activeEffect) {
                        // thu thập dependency thủ công
                        dep.add(activeEffect);
                    }
                    if (dirty) {
                        value = runner();
                        dirty = false;
                    }
                    return value;
                }
            };

            return computedRef;
        }


        function watch(source, callback, options = {}) {
            let getter = typeof source === 'function' ? source : () => source;
            let oldValue;
            let cleanupFn;

            function onCleanup(fn) {
                cleanupFn = fn;
            }

            const job = () => {
                if (cleanupFn) cleanupFn();
                const newValue = runner();
                callback(newValue, oldValue, onCleanup);
                oldValue = newValue;
            };

            const runner = effect(() => getter(), {
                lazy: true,
                scheduler: () => schedule(job)
            });

            if (options.immediate) {
                job();
            } else {
                oldValue = runner();
            }

            return () => cleanup(runner);
        }

        function stop(runner) {
            cleanup(runner);
        }

        return { reactive, effect, computed, watch, stop };
    }


    kitmodule.reactive = kitReactive
})(typeof window !== 'undefined' ? window : globalThis);

