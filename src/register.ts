import { GWModule, Signal, Edge, HIGH, If } from "gateware-ts";

export class Register extends GWModule {
  clk = this.input(Signal());
  dataIn = this.input(Signal(32));
  we = this.input(Signal());
  data = this.output(Signal(32));

  describe() {
    this.syncBlock(this.clk, Edge.Positive, [
      If (this.we ['=='] (HIGH), [
        // When write enable is high, latch the input into the data register
        this.data ['='] (this.dataIn)
      ])
    ]);
  }
}
