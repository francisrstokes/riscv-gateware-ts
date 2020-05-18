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
import {createOneShotDebouncer} from 'gateware-ts/examples/one_shot_debouncer/one-shot-debouncer';
import {SevenSegmentDriver} from 'gateware-ts/examples/seven-segment-driver/seven-segment-driver';
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
  LOW,
  Switch,
  If,
  Default,
  Case,
  HIGH,
  CombinationalSwitchAssignment,
} from 'gateware-ts';
import { Register } from './register';
import { ALU } from './alu';
import { InstructionDecoder } from './instruction-decoder';
import { RegisterOutMux } from './register-out-mux';
import { toSignedBinary, Binary, toUnsignedBinary } from './util';

const registers = ['x0', 'x1', 'x2', 'x3', 'x4', 'x5', 'x6', 'x7', 'x8', 'x9', 'x10', 'x11', 'x12', 'x13', 'x14', 'x15', 'x16', 'x17', 'x18', 'x19', 'x20', 'x21', 'x22', 'x23', 'x24', 'x25', 'x26', 'x27', 'x28', 'x29', 'x30', 'x31'];


export class CPU extends GWModule {
  instruction = this.input(Signal(32));
  clk = this.input(Signal());
  rst = this.input(Signal());
  enable = this.input(Signal());

  constructor() {
    super();
    this.programaticallyCreateSignals();
  }

  programaticallyCreateSignals() {
    // Create the x0, x1, ..., x31 register outputs
    registers.forEach(regName => {
      this.createOutput(`register_${regName}`, Signal(32));
    });
  }

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
      return (i === 0) ? LOW : rdDemux[`x${i}`];
    }

    regs.forEach((r, i) => {
      this.addSubmodule(r, `x${i}`, {
        inputs: {
          clk: this.clk,
          rst: this.rst,
          dataIn: alu.aluOut,
          we: getRegisterWriteEnableValue(i)
        },
        outputs: {
          data: [
            romux[`x${i}`],
            this[`register_x${i}`]
          ]
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
        instructionIn: this.instruction,
        clk: this.clk,
        rst: this.rst,
        enable: this.enable
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
        enable: this.enable,
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

class InstructionFeeder extends GWModule {
  clk = this.input(Signal());
  rst = this.input(Signal());
  nextInstruction = this.input(Signal());

  counter = this.output(Signal(4)); // 16 instructions max
  instruction = this.output(Signal(32));

  describe() {
    this.syncBlock(this.clk, Edge.Positive, [
      If (this.rst, [
        this.counter ['='] (0)
      ]). ElseIf (this.nextInstruction, [
        Switch (this.counter, [
          Case(0, [
            this.instruction ['='] (ADDI(1, 1, 1)), // ADD x1, 1, x1
            this.counter ['='] (1)
          ]),

          Case(1, [
            this.instruction ['='] (ORI(1, 0xf00, 2)), // OR x1, 0xf00, x2
            this.counter ['='] (2)
          ]),

          Case(2, [
            this.instruction ['='] (ADD(1, 2, 3)), // ADD x1, x2, x3
            this.counter ['='] (3)
          ]),

          Default([
            this.instruction ['='] (ADDI(0, 0, 0)), // NOP
            this.counter ['='] (0)
          ])
        ]),
      ])
    ]);
  }
}

const OneShotDebouncer = createOneShotDebouncer();
class OSDInputs extends GWModule {
  clk = this.input(Signal());
  ibtn0 = this.input(Signal());
  ibtn1 = this.input(Signal());
  ibtn2 = this.input(Signal());
  ibtn3 = this.input(Signal());
  obtn0 = this.output(Signal());
  obtn1 = this.output(Signal());
  obtn2 = this.output(Signal());
  obtn3 = this.output(Signal());

  attachOSD(i, input, output) {
    this.addSubmodule(new OneShotDebouncer(), `osd${i}`, {
      inputs: {
        clk: this.clk,
        in: input
      },
      outputs: {
        o: [output]
      }
    });
  }

  describe() {
    this.attachOSD(0, this.ibtn0, this.obtn0);
    this.attachOSD(1, this.ibtn1, this.obtn1);
    this.attachOSD(2, this.ibtn2, this.obtn2);
    this.attachOSD(3, this.ibtn3, this.obtn3);
  }
}

enum DisplayStates {
  RegisterSelect,
  RegisterView,
  InstructionView,
};
class DisplayController extends GWModule {
  clk = this.input(Signal());
  instruction = this.input(Signal(32));
  pc = this.input(Signal(4));
  btn0 = this.input(Signal());
  btn1 = this.input(Signal());
  btn2 = this.input(Signal());
  btn3 = this.input(Signal());

  // x0, x1, x2, ..., xN = this.input(Signal(32))

  state = this.internal(Signal(3));
  regCounter = this.internal(Signal(5));
  regView = this.internal(Signal(32));
  regWindow = this.internal(Signal(8));
  regWindowIndex = this.internal(Signal(2));
  instructionWindow = this.internal(Signal(8));
  instructionWindowIndex = this.internal(Signal(2));

  ledr = this.output(Signal());
  ledg = this.output(Signal());
  led4 = this.output(Signal());
  led2 = this.output(Signal());
  led1 = this.output(Signal());
  led3 = this.output(Signal());

  displaySelect = this.output(Signal());
  byteOut = this.output(Signal(8));
  clockTrigger = this.output(Signal());
  nextInstructionTrigger = this.output(Signal());
  resetTrigger = this.output(Signal());

  assignRegisterInputs() {
    registers.forEach(regName => {
      this.createInput(regName, Signal(32));
    });
  }

  constructor() {
    super();
    this.assignRegisterInputs();
  }

  modeDisplayLogic() {
    this.combinationalLogic([
      this.ledg ['='] (
        this.state ['=='] (DisplayStates.RegisterSelect) ['|'] (
          this.state ['=='] (DisplayStates.InstructionView)
        )
      ),

      this.ledr ['='] (
        this.state ['=='] (DisplayStates.RegisterView) ['|'] (
          this.state ['=='] (DisplayStates.InstructionView)
        )
      ),
    ]);
  }

  registerSelectLogic() {
    // This logic will always happen one clock cycle later because it's not combinational
    const assignViewBasedOnCounter = registers.map((regName, i) => {
      return If (this.regCounter  ['=='] (i), [
        this.regView ['='] (this[regName])
      ]);
    });

    return [
      If (this.btn1, [
        this.regCounter ['='] (this.regCounter ['+'] (1)),
      ]). ElseIf (this.btn3, [
        this.regCounter ['='] (this.regCounter ['-'] (1)),
      ]). ElseIf (this.btn0, [
        this.state ['='] (DisplayStates.RegisterView)
      ]),

      ...assignViewBasedOnCounter
    ];
  }

  registerViewLogic() {
    return [
      If (this.btn1, [
        this.regWindowIndex ['='] (this.regWindowIndex ['+'] (1)),

        If (this.regWindowIndex ['=='] (0), [ this.regWindow ['='] (this.regView.slice(31, 24)) ]),
        If (this.regWindowIndex ['=='] (1), [ this.regWindow ['='] (this.regView.slice(23, 16)) ]),
        If (this.regWindowIndex ['=='] (2), [ this.regWindow ['='] (this.regView.slice(15, 8)) ]),
        If (this.regWindowIndex ['=='] (3), [ this.regWindow ['='] (this.regView.slice(7, 0)) ]),
      ]). ElseIf (this.btn3, [
        this.regWindowIndex ['='] (this.regWindowIndex ['-'] (1)),

        If (this.regWindowIndex ['=='] (0), [ this.regWindow ['='] (this.regView.slice(31, 24)) ]),
        If (this.regWindowIndex ['=='] (1), [ this.regWindow ['='] (this.regView.slice(23, 16)) ]),
        If (this.regWindowIndex ['=='] (2), [ this.regWindow ['='] (this.regView.slice(15, 8)) ]),
        If (this.regWindowIndex ['=='] (3), [ this.regWindow ['='] (this.regView.slice(7, 0)) ]),
      ]). ElseIf (this.btn0, [
        this.state ['='] (DisplayStates.InstructionView)
      ])
    ];
  }

  instructionViewLogic() {
    return [
      If (this.btn1, [
        this.instructionWindowIndex ['='] (this.instructionWindowIndex ['+'] (1)),

        If (this.instructionWindowIndex ['=='] (0), [ this.instructionWindow ['='] (this.instruction.slice(31, 24)) ]),
        If (this.instructionWindowIndex ['=='] (1), [ this.instructionWindow ['='] (this.instruction.slice(23, 16)) ]),
        If (this.instructionWindowIndex ['=='] (2), [ this.instructionWindow ['='] (this.instruction.slice(15, 8)) ]),
        If (this.instructionWindowIndex ['=='] (3), [ this.instructionWindow ['='] (this.instruction.slice(7, 0)) ]),
      ]). ElseIf (this.btn3, [
        this.instructionWindowIndex ['='] (this.instructionWindowIndex ['-'] (1)),

        If (this.instructionWindowIndex ['=='] (0), [ this.instructionWindow ['='] (this.instruction.slice(31, 24)) ]),
        If (this.instructionWindowIndex ['=='] (1), [ this.instructionWindow ['='] (this.instruction.slice(23, 16)) ]),
        If (this.instructionWindowIndex ['=='] (2), [ this.instructionWindow ['='] (this.instruction.slice(15, 8)) ]),
        If (this.instructionWindowIndex ['=='] (3), [ this.instructionWindow ['='] (this.instruction.slice(7, 0)) ]),
      ]). ElseIf (this.btn0, [
        this.state ['='] (DisplayStates.RegisterSelect)
      ])
    ];
  }

  onReset() {
    return [
      this.state ['='] (DisplayStates.RegisterSelect),
      this.regCounter ['='] (0),
      this.regView ['='] (0)
    ];
  }

  describe() {
    this.modeDisplayLogic();

    const inRegisterView = this.state ['=='] (DisplayStates.RegisterView);
    const inRegisterSelect = this.state ['=='] (DisplayStates.RegisterSelect);
    const inInstructionView = this.state ['=='] (DisplayStates.InstructionView);

    const rvAnd = index => this.state ['=='] (DisplayStates.RegisterView) ['&'] (
      this.regWindowIndex ['=='] (index)
    );
    const ivAnd = index => inInstructionView ['&'] (
      this.instructionWindowIndex ['=='] (index)
    );

    this.combinationalLogic([
      this.resetTrigger ['='] (inRegisterSelect ['&'] (this.btn2)),
      this.clockTrigger ['='] (inRegisterView ['&'] (this.btn2)),
      this.nextInstructionTrigger ['='] (inInstructionView ['&'] (this.btn2)),

      CombinationalSwitchAssignment(this.byteOut, this.state, [
        [DisplayStates.RegisterSelect, this.regCounter.zeroExtend(8)],
        [DisplayStates.RegisterView, this.regWindow],
        [DisplayStates.InstructionView, this.instructionWindow],
      ], Constant(8, 0)),

      this.led4 ['='] (rvAnd(0) ['|'] (ivAnd(0))),
      this.led2 ['='] (rvAnd(1) ['|'] (ivAnd(1))),
      this.led1 ['='] (rvAnd(2) ['|'] (ivAnd(2))),
      this.led3 ['='] (rvAnd(3) ['|'] (ivAnd(3))),
    ]);

    this.syncBlock(this.clk, Edge.Positive, [
      this.displaySelect ['='] (Not (this.displaySelect)),

      If (this.resetTrigger,
        this.onReset()
      ) .Else ([
        Switch (this.state, [
          Case(DisplayStates.RegisterSelect, this.registerSelectLogic()),
          Case(DisplayStates.RegisterView, this.registerViewLogic()),
          Case(DisplayStates.InstructionView, this.instructionViewLogic()),
          Default([ this.state ['='] (DisplayStates.RegisterSelect) ])
        ])
      ])
    ])
  }
};

class Top extends GWModule {
  CLK   = this.input(Signal());
  BTN_N = this.input(Signal());
  BTN1  = this.input(Signal());
  BTN2  = this.input(Signal());
  BTN3  = this.input(Signal());

  LEDR_N  = this.output(Signal());
  LEDG_N  = this.output(Signal());
  LED1  = this.output(Signal());
  LED2  = this.output(Signal());
  LED3  = this.output(Signal());
  LED4  = this.output(Signal());
  LED5  = this.output(Signal());

  P1A1  = this.output(Signal());
  P1A2  = this.output(Signal());
  P1A3  = this.output(Signal());
  P1A4  = this.output(Signal());
  P1A7  = this.output(Signal());
  P1A8  = this.output(Signal());
  P1A9  = this.output(Signal());
  P1A10 = this.output(Signal());

  describe() {
    const cpu = new CPU();
    const inputs = new OSDInputs();
    const instructionFeeder = new InstructionFeeder();
    // const executor = new Executor();
    const displayController = new DisplayController();
    const ssDriver = new SevenSegmentDriver();

    this.addSubmodule(cpu, 'cpu', {
      inputs: {
        instruction: instructionFeeder.instruction,
        rst: displayController.resetTrigger,
        clk: this.CLK,
        enable: displayController.clockTrigger,
        // enable: executor.cpuEnable
      },
      // send all the registers into the display controller
      outputs: registers.reduce((outputs, regName) => {
        // On the CPU, to avoid a conflict with the submodule name, the xN outputs
        // are named as "register_xN"
        outputs[`register_${regName}`] = [displayController[regName]];
        return outputs;
      }, {})
    });

    this.addSubmodule(inputs, 'inputs', {
      inputs: {
        clk: this.CLK,
        ibtn0: this.BTN_N,
        ibtn1: this.BTN1,
        ibtn2: this.BTN2,
        ibtn3: this.BTN3,
      },
      outputs: {
        obtn0: [displayController.btn0],
        obtn1: [displayController.btn1],
        obtn2: [displayController.btn2],
        obtn3: [displayController.btn3],
      }
    });

    this.addSubmodule(instructionFeeder, 'instructionFeeder', {
      inputs: {
        clk: this.CLK,
        rst: displayController.resetTrigger,
        nextInstruction: displayController.nextInstructionTrigger,
        // nextInstruction: executor.advanceInstruction,
      },
      outputs: {
        counter: [displayController.pc],
        instruction: [displayController.instruction, cpu.instruction],
      }
    });

    // this.addSubmodule(executor, 'executor', {
    //   inputs: {
    //     clk: this.CLK,
    //     rst: displayController.resetTrigger,
    //     advanceInstruction: displayController.nextInstructionTrigger,
    //     advanceClk: displayController.clockTrigger,
    //   },
    //   outputs: {
    //     cpuEnable: [cpu.enable],
    //     nextInstruction: [instructionFeeder.nextInstruction],
    //   }
    // });

    this.addSubmodule(displayController, 'displayController', {
      inputs: {
        clk: this.CLK,
        instruction: instructionFeeder.instruction,
        pc: instructionFeeder.counter,
        btn0: inputs.obtn0,
        btn1: inputs.obtn1,
        btn2: inputs.obtn2,
        btn3: inputs.obtn3,

        ...registers.reduce((regInputs, regName) => {
          regInputs[regName] = cpu[`register_${regName}`];
          return regInputs;
        }, {})
      },
      outputs: {
        ledr: [this.LEDR_N],
        ledg: [this.LEDG_N],
        led1: [this.LED1],
        led2: [this.LED2],
        led3: [this.LED3],
        led4: [this.LED4],
        displaySelect: [ssDriver.sel, this.P1A10],
        byteOut: [ssDriver.byte],
        clockTrigger: [cpu.enable],
        nextInstructionTrigger: [instructionFeeder.nextInstruction],
        // clockTrigger: [executor.advanceClk],
        // nextInstructionTrigger: [executor.nextInstruction],
        resetTrigger: [
          cpu.rst,
          instructionFeeder.rst,
          // executor.rst
        ]
      }
    });

    this.addSubmodule(ssDriver, 'ssDriver', {
      inputs: {
        clk: this.CLK,
        sel: displayController.displaySelect,
        byte: displayController.byteOut,
      },
      outputs: {
        a: [this.P1A1],
        b: [this.P1A2],
        c: [this.P1A3],
        d: [this.P1A4],
        e: [this.P1A7],
        f: [this.P1A8],
        g: [this.P1A9],
      }
    });
  }
}

class Sim extends GWModule {
  CLK   = this.input(Signal());
  BTN_N = this.input(Signal());
  BTN1  = this.input(Signal());
  BTN2  = this.input(Signal());
  BTN3  = this.input(Signal());

  instruction  = this.input(Signal(32, Signedness.Unsigned, 0xdeadbeef));

  LEDR_N  = this.output(Signal());
  LEDG_N  = this.output(Signal());
  LED1  = this.output(Signal());
  LED2  = this.output(Signal());
  LED3  = this.output(Signal());
  LED4  = this.output(Signal());
  LED5  = this.output(Signal());

  displaySelect  = this.output(Signal());
  displayByte = this.output(Signal(8));
  clockTrigger = this.output(Signal());
  nextInstructionTrigger = this.output(Signal());

  P1A1  = this.output(Signal());
  P1A2  = this.output(Signal());
  P1A3  = this.output(Signal());
  P1A4  = this.output(Signal());
  P1A7  = this.output(Signal());
  P1A8  = this.output(Signal());
  P1A9  = this.output(Signal());
  P1A10 = this.output(Signal());

  describe() {
    const displayController = new DisplayController();

    this.addSubmodule(displayController, 'displayController', {
      inputs: {
        clk: this.CLK,
        instruction: this.instruction,
        pc: Constant(4, 0b0000),
        btn0: this.BTN_N,
        btn1: this.BTN1,
        btn2: this.BTN2,
        btn3: this.BTN3,

        ...registers.reduce((regInputs, regName, i) => {
          regInputs[regName] = Constant(32, i);
          return regInputs;
        }, {})
      },
      outputs: {
        ledr: [this.LEDR_N],
        ledg: [this.LEDG_N],
        led1: [this.LED1],
        led2: [this.LED2],
        led3: [this.LED3],
        led4: [this.LED4],
        displaySelect: [this.displaySelect],
        byteOut: [this.displayByte],
        clockTrigger: [this.clockTrigger],
        nextInstructionTrigger: [this.nextInstructionTrigger],
      }
    });

    this.simulation.everyTimescale(5, [
      this.CLK ['='] (Not(this.CLK))
    ]);

    const clkHigh = edge(Edge.Positive, this.CLK);
    const clkLow = edge(Edge.Negative, this.CLK);

    const press = btn => [
      btn ['='] (HIGH),
      clkLow,
      btn ['='] (LOW),
      clkHigh
    ];

    this.simulation.run([
      clkHigh,
      clkHigh,
      clkHigh,

      // Start in register select

      // Increase the register selector
      ...press(this.BTN1),

      // Go to register view
      ...press(this.BTN_N),
      ...press(this.BTN1),
      ...press(this.BTN1),
      ...press(this.BTN1),
      ...press(this.BTN1),
      ...press(this.BTN1),

      // Send clock pulses to the CPU
      ...press(this.BTN2),
      ...press(this.BTN2),
      ...press(this.BTN2),

      // Go to the instruction view
      ...press(this.BTN_N),
      ...press(this.BTN1),
      ...press(this.BTN1),
      ...press(this.BTN1),

      clkHigh,
      clkHigh,
    ]);
  }
}

// const cg = new CodeGenerator(new Sim('top'), {
//   simulation: {
//     enabled: true,
//     timescale: [ nanoseconds(1), picoseconds(10) ]
//   }
// });
// cg.runSimulation('riscv-on-metal-sim', 'riscv-on-metal-sim.vcd', false);

console.time('Bitstream build');
const cg = new CodeGenerator(new Top('top'));
cg.buildBitstream('riscv-on-metal', false).then(() => {
  console.timeEnd('Bitstream build');
});
