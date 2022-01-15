class TuringTape {
    constructor(symbols, empty_symbol = null, tape = [empty_symbol], head = 0, validate = true) {
        if (validate) {
            if (!symbols.has(empty_symbol)) {
                throw `Invalid empty symbol '${empty_symbol}'`;
            }

            for (let s of tape) {
                if (!symbols.has(s)) {
                    throw `Invalid initial tape symbol '${s}'`;
                }
            }

            if ((tape.length > 0) && (head < 0 || head >= tape.length)) {
                throw `Invalid initial head index ${head}`;
            }
        }

        this.symbols = symbols;
        this.empty_symbol = empty_symbol;
        this.tape = tape;
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
        if (!this.symbols.has(symbol)) {
            throw `Trying to add invalid symbol '${symbol}'`;
        }

        this.tape[this.head] = symbol;
    }

    as_array() {
        // return a copy of tape
        return [...this.tape];
    }
}