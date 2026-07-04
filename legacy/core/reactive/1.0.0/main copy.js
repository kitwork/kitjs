(function (global) {
    const kitmodule = global.kitmodule || (global.kitmodule = {});
    function kitReactive() {
        const bucket = new WeakMap(); // target -> Map(key -> Set(effect))
        let activeEffect = null;

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

        function track(target, key) {
            if (!activeEffect) return;
            //  console.log('Tracking:', key, 'on', target); // Debug
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

            deps.add(activeEffect);
            activeEffect.deps.push(deps);
        }

        function trigger(target, key) {
            const depsMap = bucket.get(target);
            if (!depsMap) return;
            // console.log('Triggering:', key, 'on', target); // Debug
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
                const result = fn(); // capture return value for computed
                activeEffect = null;
                return result;
            };
            effectFn.deps = [];
            effectFn.scheduler = options.scheduler;
            if (!options.lazy) {
                effectFn();
            }
            return effectFn;
        }

        function reactive(obj, cache = new WeakMap()) {
            if (typeof obj !== 'object' || obj === null) return obj;
            if (cache.has(obj)) return cache.get(obj);

            const proxy = new Proxy(obj, {
                get(target, key, receiver) {
                    const res = Reflect.get(target, key, receiver);
                    track(target, key);
                    return typeof res === 'object' ? reactive(res, cache) : res;
                },
                set(target, key, value, receiver) {
                    const oldVal = target[key];
                    const result = Reflect.set(target, key, value, receiver);
                    if (oldVal !== value) {
                        trigger(target, key);
                    }
                    return result;
                }
            });

            cache.set(obj, proxy);
            return proxy;
        }

        function computed(getter) {
            let value;
            let dirty = true;

            const runner = effect(getter, {
                lazy: true,
                scheduler: () => {
                    dirty = true;
                    trigger(computedRef, 'value');
                }
            });

            const computedRef = {
                get value() {
                    if (dirty) {
                        value = runner();
                        dirty = false;
                    }
                    track(computedRef, 'value');
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

