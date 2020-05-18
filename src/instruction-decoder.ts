import {
  GWModule,
  Signal,
  Edge,
  Not,
  edge,
  CodeGenerator,
  nanoseconds,
  picoseconds,
  CombinationalSwitchAssignment,
  Constant,
  If,
  HIGH,
  LOW,
} from 'gateware-ts';

/*
O = Opcode
D = Destination Register
F = Function (1)
R = Source Register 1
r = Source Register 2
f = Function (2)
I = Immediate

=--------=---------------------+-----+-----+---=
|        |  3         2        | 1   |     | 0 |
|        | 10987654321098765432|10987|65432|10 |
=--------=---------------------+-----+-----+---=
| R-type | fffffffrrrrrRRRRRFFF|DDDDD|OOOOO|11 |
| I-type | IIIIIIIIIIIIRRRRRFFF|DDDDD|OOOOO|11 |
| S-type | IIIIIIIrrrrrRRRRRFFF|DDDDD|OOOOO|11 |
| U-type | IIIIIIIIIIIIIIIIIIII|DDDDD|OOOOO|11 |
=--------=---------------------+-----+-----+---=
*/

const ImmediateArithmetic = Constant(7, 0b0010011);
const RegisterArithmetic  = Constant(7, 0b0110011);
const ZERO = Constant(32, 0);

export class InstructionDecoder extends GWModule {
  clk = this.input(Signal());
  instructionIn = this.input(Signal(32));
  enable = this.input(Signal());
  rst = this.input(Signal());

  // control signals
  ALUEnable = this.output(Signal());
  ALUImmediateMode = this.output(Signal());

  opcode = this.output(Signal(7));
  rs1 = this.output(Signal(5));
  rs2 = this.output(Signal(5));
  rd = this.output(Signal(5));
  imm12 = this.output(Signal(12));
  func3 = this.output(Signal(3));

  instruction = this.internal(Signal(32));

  describe() {

    const whenEnabled = s => this.enable.signExtend(s.width) ['&'] (s);

    this.syncBlock(this.clk, Edge.Positive, [
      If (this.rst, [
        this.instruction ['='] (ZERO)
      ]). ElseIf (this.enable, [
        this.instruction ['='] (this.instructionIn)
      ])
    ]);

    this.combinationalLogic([
      this.opcode ['='] (whenEnabled(this.instruction.slice(6, 0))),
      this.rs2 ['='] (whenEnabled(this.instruction.slice(24, 20))),
      this.rs1 ['='] (whenEnabled(this.instruction.slice(19, 15))),
      this.rd ['='] (whenEnabled(this.instruction.slice(11, 7))),
      this.imm12 ['='] (whenEnabled(this.instruction.slice(31, 20))),
      this.func3 ['='] (whenEnabled(this.instruction.slice(14, 12))),
    ]);

    this.combinationalLogic([
      CombinationalSwitchAssignment(this.ALUEnable, this.opcode, [
        [ImmediateArithmetic, HIGH],
        [RegisterArithmetic, HIGH],
      ], LOW),

      this.ALUImmediateMode ['='] (this.opcode ['=='] (ImmediateArithmetic))
    ]);
  }
}
