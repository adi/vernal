# Vernal
### Vernal IoC container for TypeScript

Spring Boot inspired IoC container for TypeScript originally created for Node.js applications.

The library provides `@Component(type)/@Singleton/@Prototype`, `@Autowire(class|name)/@Inject(class|name)` and `@PostConstruct` decorators.

- `@Component(type)` - registers the annotated class as a bean using type `type`. Note that it is also possible to use `Vernal.registerBean` instead of the @Component decorator.

- `@Singleton` - shorthand for @Component(BeanType.SINGLETON).

- `@Prototype` - shorthand for @Component(BeanType.PROTOTYPE).

- `@Autowire(class|name)/@Inject(class|name)` - initializes a class field to the registered bean value. Bean can be specified by class or by name

- `@PostConstruct` - designates a sync or async method to run after the bean is completely initialized

In special cases it is also possible to use `Vernal.registerValue` to register free-form values or `Vernal.registerInstance` to register existing object instances.

To retrieve a bean instance outside of injection context use `Vernal.getBeanInstance(class|name)`.

# Usage example

```typescript
import { Vernal, Singleton, Prototype, Inject, PostConstruct } from 'vernal';

process.on('unhandledRejection', (err) => {
  console.error('Unhandled rejection:');
  console.error(err);
});

class X {
}

Vernal.registerInstance(new X());

Vernal.registerValue('V', { text: 'abc' });

@Prototype
class A {
  public n = Math.random();
  @Inject('D')
  private d: any;
  @Inject(X)
  private x: any;
  @Inject('V')
  private v: any;

  @PostConstruct
  async init() {
    console.log('A.init');
    console.log(this.d);
    console.log(this.x);
    console.log(this.v);
  }
}

@Singleton
class B {
  @Inject(A)
  private a: any;

  @PostConstruct
  async init() {
    console.log('B.init');
    console.log(this.a);
  }
}

@Singleton
class C {
  @Inject(A)
  private a: any;

  @PostConstruct
  async init() {
    console.log('C.init');
    console.log(this.a);
  }
}

@Singleton
class D {
  @Inject(B)
  private b: any;
  @Inject(C)
  private c: any;

  @PostConstruct
  async init() {
    console.log('D.init');
    console.log(this.b);
    console.log(this.c);
  }
}

(async () => {
  console.log('App starting...');
  await Vernal.run();
  console.log('App started');
})();
```
