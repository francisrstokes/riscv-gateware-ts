import { describe, test } from 'gateware-ts/testware';
import {
  ADDI,
  ANDI,
  ORI,
  XORI,
  ADD,
  AND,
  OR,
  XOR,
  SLT,
  SLTI,
  SLTUI,
  SLTU,
  SLLI,
  SLL,
  SRLI,
  SRL,
  SRAI,
  SRA,
  SUB
} from './instructions/index';
import { RdDemux } from './destination-demux';
import {
  GWModule,
  Signal,
  Edge,
  Not,
  edge,
  CodeGenerator,
  nanoseconds,
  picoseconds,
  Signedness,
  SubmodulePath,
  Constant,
} from 'gateware-ts';
import { Register } from './register';
import { ALU } from './alu';
import { InstructionDecoder } from './instruction-decoder';
import { RegisterOutMux } from './register-out-mux';
import { toSignedBinary, Binary, toUnsignedBinary } from './util';

const registers = ['x0', 'x1', 'x2', 'x3', 'x4', 'x5', 'x6', 'x7', 'x8', 'x9', 'x10', 'x11', 'x12', 'x13', 'x14', 'x15', 'x16', 'x17', 'x18', 'x19', 'x20', 'x21', 'x22', 'x23', 'x24', 'x25', 'x26', 'x27', 'x28', 'x29', 'x30', 'x31'];


class TLM extends GWModule {
  instruction = this.input(Signal(32));

  clk = this.input(Signal());
  aluOutBus = this.output(Signal(32));
  rd = this.output(Signal(5));

  LOW = this.internal(Signal(1, Signedness.Unsigned, 0));
  LOW32 = this.internal(Signal(32, Signedness.Unsigned, 0));

  describe() {
    const regs = Array.from({length: 32}, () => new Register());
    const romux = new RegisterOutMux();
    const alu = new ALU();
    const instructionDecoder = new InstructionDecoder();
    const rdDemux = new RdDemux();

    // x0 is special - it cannot be written to
    // so we need to map it correctly in the inputs and outputs
    const getRdDemuxOutputWriteEnableSignals = () => {
      return registers.reduce((acc, reg, i) => {
        if (i > 0) {
          acc[reg] = [regs[i].we];
        }
        return acc;
      }, {})
    };
    const getRegisterWriteEnableValue = i => {
      return (i === 0) ? this.LOW : rdDemux[`x${i}`];
    }

    regs.forEach((r, i) => {
      this.addSubmodule(r, `x${i}`, {
        inputs: {
          clk: this.clk,
          dataIn: alu.aluOut,
          we: getRegisterWriteEnableValue(i)
        },
        outputs: {
          data: [romux[`x${i}`]]
        }
      });
    });

    this.addSubmodule(rdDemux, 'rdDemux', {
      inputs: {
        rd: instructionDecoder.rd,
        writeEnable: instructionDecoder.ALUEnable
      },
      outputs: getRdDemuxOutputWriteEnableSignals()
    });

    this.addSubmodule(romux, 'romux', {
      inputs: {
        ...registers.reduce((acc, reg, i) => {
          acc[reg] = regs[i].data;
          return acc;
        }, {}),
        sel1: instructionDecoder.rs1,
        sel2: instructionDecoder.rs2,
      },
      outputs: {
        out1: [alu.rs1],
        out2: [alu.rs2],
      }
    });

    this.addSubmodule(instructionDecoder, 'decoder', {
      inputs: {
        instruction: this.instruction
      },
      outputs: {
        ALUEnable: [rdDemux.writeEnable],
        ALUImmediateMode: [alu.i2sel],
        rs1: [romux.sel1],
        rs2: [romux.sel2],
        rd: [rdDemux.rd],
        imm12: [alu.imm],
        func3: [alu.op],
      }
    });

    this.addSubmodule(alu, 'alu', {
      inputs: {

        rs1: romux.out1,
        rs2: romux.out2,
        imm: instructionDecoder.imm12,
        i2sel: instructionDecoder.ALUImmediateMode,
        op: instructionDecoder.func3,
      },
      outputs: {
        aluOut: regs.map(r => r.dataIn)
      }
    });
  }
}

class Test extends GWModule {
  instruction = this.input(Signal(32));
  clk = this.input(Signal());

  rd = this.output(Signal(5));
  aluOutBus = this.output(Signal(32));

  describe() {
    const UUT = new TLM();
    this.addSubmodule(UUT, 'uut', {
      inputs: {
        instruction: this.instruction,
        clk: this.clk,
      },
      outputs: {
        aluOutBus: [this.aluOutBus],
        rd: [this.rd],
      }
    });

    this.simulation.everyTimescale(5, [ this.clk ['='] (Not(this.clk)) ]);
    const pulse = edge(Edge.Positive, this.clk);

    const x = Array.from({length:32}, (_, i) => i);
    const rd1 = x[8];
    const rd2 = x[9];
    const rd3 = x[10];
    const rd1Path = `uut.x8.data`;
    const rd2Path = `uut.x9.data`;
    const rd3Path = `uut.x10.data`;

    const regPath = i => `uut.x${i}.data`;
    const setRegister = (i, val) => SubmodulePath(regPath(i)).setTo(val);
    const getRegister = (i) => SubmodulePath(regPath(i));
    const reg  = i => x[i];

    const immTest = (name, instCstr, opFn) => test(name, expect => {
      const r1 = toSignedBinary(0x101).signExtend(32);
      const r2 = toSignedBinary(0x202).signExtend(32);
      const r3 = toSignedBinary(-10).signExtend(32);

      const i1 = toSignedBinary(0x200).signExtend(12);
      const i2 = toSignedBinary(0x123).signExtend(12);
      const i3 = toSignedBinary(10).signExtend(12);

      return [
        // Set up some register values
        setRegister(1, r1.toNumber()),
        setRegister(2, r2.toNumber()),
        setRegister(3, r3.toNumber()),
        pulse,

        this.instruction ['='] (instCstr(reg(1), i1.toNumber(), rd1)),
        pulse,
        this.instruction ['='] (instCstr(reg(2), i2.toNumber(), rd2)),
        pulse,
        this.instruction ['='] (instCstr(reg(3), i3.toNumber(), rd3)),
        expect(SubmodulePath(rd1Path) ['=='] (Constant(32, opFn(r1, i1.signExtend(32)))), ''),
        pulse,
        expect(SubmodulePath(rd2Path) ['=='] (Constant(32, opFn(r2, i2.signExtend(32)))), ''),
        pulse,
        expect(SubmodulePath(rd3Path) ['=='] (Constant(32, opFn(r3, i3.signExtend(32)))), ''),
      ];
    });

    const regTest = (name, instCstr, opFn) => test(name, expect => {
      const r1_1 = toSignedBinary(0x101).signExtend(32);
      const r1_2 = toSignedBinary(0x202).signExtend(32);
      const r1_3 = toSignedBinary(-10).signExtend(32);

      const r2_1 = toSignedBinary(0x200).signExtend(32);
      const r2_2 = toSignedBinary(0x123).signExtend(32);
      const r2_3 = toSignedBinary(10).signExtend(32);

      return [
        // Set up some register values
        setRegister(1, r1_1.toNumber()),
        setRegister(2, r1_2.toNumber()),
        setRegister(3, r1_3.toNumber()),
        setRegister(4, r2_1.toNumber()),
        setRegister(5, r2_2.toNumber()),
        setRegister(6, r2_3.toNumber()),
        pulse,

        this.instruction ['='] (instCstr(reg(1), reg(4), rd1)),
        pulse,
        this.instruction ['='] (instCstr(reg(2), reg(5), rd2)),
        pulse,
        this.instruction ['='] (instCstr(reg(3), reg(6), rd3)),
        expect(SubmodulePath(rd1Path) ['=='] (Constant(32, opFn(r1_1, r2_1))), ''),
        pulse,
        expect(SubmodulePath(rd2Path) ['=='] (Constant(32, opFn(r1_2, r2_2))), ''),
        pulse,
        expect(SubmodulePath(rd3Path) ['=='] (Constant(32, opFn(r1_3, r2_3))), ''),
      ];
    });

    const shiftImmTest = (name, instCstr, opFn) => test(name, expect => {
      const r1 = toUnsignedBinary(0x101).zeroExtend(32);
      const r2 = toUnsignedBinary(0x202).zeroExtend(32);
      const r3 = toUnsignedBinary(0xdeadbeef).zeroExtend(32);

      const i1 = toUnsignedBinary(2).zeroExtend(5);
      const i2 = toUnsignedBinary(10).zeroExtend(5);
      const i3 = toUnsignedBinary(31);

      return [
        // Set up some register values
        setRegister(1, r1.toNumber()),
        setRegister(2, r2.toNumber()),
        setRegister(3, r3.toNumber()),
        pulse,

        this.instruction ['='] (instCstr(reg(1), i1.toNumber(), rd1)),
        pulse,
        this.instruction ['='] (instCstr(reg(2), i2.toNumber(), rd2)),
        pulse,
        this.instruction ['='] (instCstr(reg(3), i3.toNumber(), rd3)),
        expect(SubmodulePath(rd1Path) ['=='] (Constant(32, opFn(r1, i1))), ''),
        pulse,
        expect(SubmodulePath(rd2Path) ['=='] (Constant(32, opFn(r2, i2))), ''),
        pulse,
        expect(SubmodulePath(rd3Path) ['=='] (Constant(32, opFn(r3, i3))), ''),
      ];
    });

    const shiftRegTest = (name, instCstr, opFn) => test(name, expect => {
      const r1_1 = toUnsignedBinary(0x101).zeroExtend(32);
      const r1_2 = toUnsignedBinary(0x202).zeroExtend(32);
      const r1_3 = toUnsignedBinary(0xdeadbeef).zeroExtend(32);
      const r2_1 = toUnsignedBinary(1).zeroExtend(32);
      const r2_2 = toUnsignedBinary(10).zeroExtend(32);
      const r2_3 = toUnsignedBinary(31).zeroExtend(32);

      return [
        // Set up some register values
        setRegister(1, r1_1.toNumber()),
        setRegister(2, r1_2.toNumber()),
        setRegister(3, r1_3.toNumber()),
        setRegister(4, r2_1.toNumber()),
        setRegister(5, r2_2.toNumber()),
        setRegister(6, r2_3.toNumber()),
        pulse,

        this.instruction ['='] (instCstr(reg(1), reg(4), rd1)),
        pulse,
        this.instruction ['='] (instCstr(reg(2), reg(5), rd2)),
        pulse,
        this.instruction ['='] (instCstr(reg(3), reg(6), rd3)),
        expect(SubmodulePath(rd1Path) ['=='] (Constant(32, opFn(r1_1, r2_1))), ''),
        pulse,
        expect(SubmodulePath(rd2Path) ['=='] (Constant(32, opFn(r1_2, r2_2))), ''),
        pulse,
        expect(SubmodulePath(rd3Path) ['=='] (Constant(32, opFn(r1_3, r2_3))), ''),
      ];
    });

    const bOp = fn => (...args) => fn(...args).toNumber();

    this.simulation.run(describe('ALU Integration', [
      immTest('ADDI', ADDI, bOp(Binary.add)),
      immTest('ANDI', ANDI, bOp(Binary.and)),
      immTest('ORI',  ORI,  bOp(Binary.or)),
      immTest('XORI', XORI, bOp(Binary.xor)),
      immTest('SLTI', SLTI, bOp(Binary.lessThanSigned)),
      immTest('SLTUI', SLTUI, bOp(Binary.lessThan)),
      shiftImmTest('SLLI', SLLI, bOp(Binary.shiftLeft)),
      shiftImmTest('SRLI', SRLI, bOp(Binary.shiftRight)),
      shiftImmTest('SRAI', SRAI, bOp(Binary.shiftRightArithmetic)),

      regTest('ADD', ADD, bOp(Binary.add)),
      regTest('SUB', SUB, bOp(Binary.sub)),
      regTest('AND', AND, bOp(Binary.and)),
      regTest('OR',  OR,  bOp(Binary.or)),
      regTest('XOR', XOR, bOp(Binary.xor)),
      regTest('SLT', SLT, bOp(Binary.lessThanSigned)),
      regTest('SLTU', SLTU, bOp(Binary.lessThan)),
      shiftRegTest('SLL', SLL, bOp(Binary.shiftLeft)),
      shiftRegTest('SRL', SRL, bOp(Binary.shiftRight)),
      shiftRegTest('SRA', SRA, bOp(Binary.shiftRightArithmetic)),

      test('x0 is non-writable', expect => {
        return [
          this.instruction ['='] (ADDI(reg(0), 0x01, reg(0))),
          pulse,
          pulse,
          expect(getRegister(0) ['=='] (0), '')
        ];
      }),
    ]));
  }
}

const cg = new CodeGenerator(new Test(), {
  simulation: {
    enabled: true,
    timescale: [ nanoseconds(1), picoseconds(10) ]
  }
});

cg.runSimulation('riscv-whole', 'riscv-whole.vcd', false);
