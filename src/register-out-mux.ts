import { GWModule, Signal, CombinationalSwitchAssignment } from 'gateware-ts';

export class RegisterOutMux extends GWModule {
  x0 = this.input(Signal(32));
  x1 = this.input(Signal(32));
  x2 = this.input(Signal(32));
  x3 = this.input(Signal(32));
  x4 = this.input(Signal(32));
  x5 = this.input(Signal(32));
  x6 = this.input(Signal(32));
  x7 = this.input(Signal(32));
  x8 = this.input(Signal(32));
  x9 = this.input(Signal(32));
  x10 = this.input(Signal(32));
  x11 = this.input(Signal(32));
  x12 = this.input(Signal(32));
  x13 = this.input(Signal(32));
  x14 = this.input(Signal(32));
  x15 = this.input(Signal(32));
  x16 = this.input(Signal(32));
  x17 = this.input(Signal(32));
  x18 = this.input(Signal(32));
  x19 = this.input(Signal(32));
  x20 = this.input(Signal(32));
  x21 = this.input(Signal(32));
  x22 = this.input(Signal(32));
  x23 = this.input(Signal(32));
  x24 = this.input(Signal(32));
  x25 = this.input(Signal(32));
  x26 = this.input(Signal(32));
  x27 = this.input(Signal(32));
  x28 = this.input(Signal(32));
  x29 = this.input(Signal(32));
  x30 = this.input(Signal(32));
  x31 = this.input(Signal(32));

  sel1 = this.input(Signal(5));
  sel2 = this.input(Signal(5));
  out1 = this.output(Signal(32));
  out2 = this.output(Signal(32));

  describe() {
    this.combinationalLogic([
      CombinationalSwitchAssignment(
        this.out1,
        this.sel1,
        Array.from({length: 32}, (_, i) => [i, this[`x${i}`]])
      ),

      CombinationalSwitchAssignment(
        this.out2,
        this.sel2,
        Array.from({length: 32}, (_, i) => [i, this[`x${i}`]])
      ),
    ])
  }
};
