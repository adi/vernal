import { Vernal, Component, Autowire } from "..";
import { Expose } from "./Expose";

@Component
class A {
  async init() {
    console.log('A.init');
  }
}

@Expose
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
