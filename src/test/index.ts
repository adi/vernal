import { Component, Autowire, Vernal } from "../annotations/Component";

@Component
class A {
  @Autowire(B)
  private b: any;

  init() {
    console.log(this.b);
  }
}

@Component
class B {
    @Autowire(A)
    private a: any;

    init() {
        console.log(this.a);
    }
}

Vernal.run();
