import { GWModule, Signal } from 'gateware-ts';

export class RegisterInMux extends GWModule {
  alu = this.input(Signal(32));
  sel = this.input(Signal());
  out = this.output(Signal(32));

  describe() {
    this.combinationalLogic([
      this.out ['='] (this.alu)
    ]);
  }
};
