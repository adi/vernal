import { Vernal, Singleton, Prototype, Inject, PostConstruct } from "..";

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
