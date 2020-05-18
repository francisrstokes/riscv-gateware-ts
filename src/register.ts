import { GWModule, Signal, Edge, HIGH, If, Constant } from "gateware-ts";

const ZERO = Constant(32, 0);

export class Register extends GWModule {
  clk = this.input(Signal());
  dataIn = this.input(Signal(32));
  we = this.input(Signal());
  rst = this.input(Signal());
  data = this.output(Signal(32));

  describe() {
    this.syncBlock(this.clk, Edge.Positive, [
      If (this.rst, [
        this.data ['='] (ZERO)
      ]). ElseIf (this.we ['=='] (HIGH), [
        // When write enable is high, latch the input into the data register
        this.data ['='] (this.dataIn)
      ])
    ]);
  }
}
