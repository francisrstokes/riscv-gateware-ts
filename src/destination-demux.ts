import { BitChoice } from './util';
import { GWModule, Signal, Ternary, Constant } from 'gateware-ts';

export class RdDemux extends GWModule {
  writeEnable = this.input(Signal());
  rd = this.input(Signal(5));
  x0 = this.output(Signal());
  x1 = this.output(Signal());
  x2 = this.output(Signal());
  x3 = this.output(Signal());
  x4 = this.output(Signal());
  x5 = this.output(Signal());
  x6 = this.output(Signal());
  x7 = this.output(Signal());
  x8 = this.output(Signal());
  x9 = this.output(Signal());
  x10 = this.output(Signal());
  x11 = this.output(Signal());
  x12 = this.output(Signal());
  x13 = this.output(Signal());
  x14 = this.output(Signal());
  x15 = this.output(Signal());
  x16 = this.output(Signal());
  x17 = this.output(Signal());
  x18 = this.output(Signal());
  x19 = this.output(Signal());
  x20 = this.output(Signal());
  x21 = this.output(Signal());
  x22 = this.output(Signal());
  x23 = this.output(Signal());
  x24 = this.output(Signal());
  x25 = this.output(Signal());
  x26 = this.output(Signal());
  x27 = this.output(Signal());
  x28 = this.output(Signal());
  x29 = this.output(Signal());
  x30 = this.output(Signal());
  x31 = this.output(Signal());

  registerSelect = this.internal(Signal(5));

  describe() {
    this.combinationalLogic([
      this.registerSelect ['='] (BitChoice(this.writeEnable,
        Constant(5, 0),
        this.rd,
      )),

      ...Array.from({length: 32}, (_, i) =>
        this[`x${i}`] ['='] (this.registerSelect ['=='] (i))
      )
    ])
  }
}