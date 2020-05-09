import { BitChoice } from './util';
import {
  GWModule,
  Signal,
  CombinationalSwitchAssignment,
  Constant,
  Concat,
} from 'gateware-ts';

const ZERO = Constant(32, 0);

export const Ops = {
  ADD:  Constant(3, 0),
  SLL:  Constant(3, 1),
  SLT:  Constant(3, 2),
  SLTU: Constant(3, 3),
  XOR:  Constant(3, 4),
  SR:   Constant(3, 5),
  OR:   Constant(3, 6),
  AND:  Constant(3, 7),
};

export class ALU extends GWModule {
  rs1 = this.input(Signal(32));
  rs2 = this.input(Signal(32));
  imm = this.input(Signal(12));
  i2sel = this.input(Signal());
  op = this.input(Signal(3));

  aluOut = this.output(Signal(32));

  shiftBy = this.internal(Signal(5));
  input2 = this.internal(Signal(32));
  mode = this.internal(Signal());

  continuousAssignments() {
    this.combinationalLogic([
      // The lower 5 bits of of input2 hold the shift value
      this.shiftBy ['='] (BitChoice(this.i2sel,
        this.rs2.slice(4, 0),
        this.imm.slice(4, 0)
      )),

      this.input2 ['='] (BitChoice(this.i2sel,
        this.rs2,
        this.imm.signExtend(32),
      )),

      // Bit 10 of the immediate is sometimes encodes a mode
      this.mode ['='] (this.imm.bit(10))
    ]);
  }

  describe() {
    this.continuousAssignments();

    this.combinationalLogic([
      CombinationalSwitchAssignment(this.aluOut, this.op, [
        [Ops.ADD,
          BitChoice(this.i2sel,
            BitChoice(this.mode,
              this.rs1.asSigned() ['+'] (this.input2.asSigned()),
              this.rs1.asSigned() ['-'] (this.input2.asSigned())
            ),
            this.rs1.asSigned() ['+'] (this.input2.asSigned()),
          )
        ],

        [Ops.AND, this.rs1 ['&'] (this.input2)],
        [Ops.OR,  this.rs1 ['|'] (this.input2)],
        [Ops.XOR, this.rs1 ['^'] (this.input2)],

        [Ops.SLL, this.rs1 ['<<'] (this.shiftBy)],
        [Ops.SR,
          BitChoice(this.mode,
            this.rs1 ['>>'] (this.shiftBy),
            Concat([
              this.rs1.bit(31), // Keep the sign bit
              this.rs1.asSigned() ['>>>'] (this.shiftBy) .slice(30, 0)
            ])
          )
        ],

        [Ops.SLT, this.rs1.asSigned() ['<'] (this.input2.asSigned())],
        [Ops.SLTU, this.rs1 ['<'] (this.input2)],
      ], ZERO)
    ]);
  }
}
