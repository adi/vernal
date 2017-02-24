# Vernal
### Vernal IoC container for TypeScript

Spring Boot inspired IoC container for TypeScript originally created for Node.js applications.

The library provides `@Component` and `@Autowire(class|name)` decorators.

- `@Component` - registers a singleton instance of the annotated class. Note that it is also possible to use `Vernal.registerComponent` instead of the @Component decorator

- `@Autowire(class|name)` - initializes a class field to the registered component value. Component can be specified by class or by name

In special cases it is also possible to use `Vernal.registerValue` to register free-form values or `Vernal.registerComponentInstance` to register existing object instances.

# Usage example

```typescript
import { Vernal, Component, Autowire } from 'vernal';

@Component
class A {
  async init() {
    console.log('A.init');
  }
}

@Component
class B {
    @Autowire(A)
    private a: any;

    async init() {
      console.log('B.init');
      console.log(this.a);
    }
}

(async () => {
  console.log('App starting...');
  await Vernal.run();
  console.log('App started');
})();
```
