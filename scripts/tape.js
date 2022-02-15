// Copyright (C) 2022 Simona Dimitrova

class TuringTape {
    constructor(empty_symbol, tape = [empty_symbol], head = 0) {
        if ((tape.length > 0) && (head < 0 || head >= tape.length)) {
            throw `Invalid initial head index ${head}`;
        }

        this.empty_symbol = empty_symbol;
        this.tape = [...tape]; // copy the tape
        this.head = head;
    }

    head_move_left() {
        this.head -= 1;
        if (this.head < 0) {
            this.head = 0;
            this.tape.unshift(this.empty_symbol);
        }
    }

    head_move_right() {
        this.head += 1;

        if (this.head >= this.tape.length) {
            this.head = this.tape.length;
            this.tape.push(this.empty_symbol);
        }
    }

    head_index() {
        return this.head;
    }

    head_read() {
        return this.tape[this.head];
    }

    head_write(symbol) {
        this.tape[this.head] = symbol;
    }

    as_array() {
        // return a copy of tape
        // https://stackoverflow.com/a/69969944/348183
        return [...this.tape];
    }
}