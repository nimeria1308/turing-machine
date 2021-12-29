class TuringTape {
    constructor(symbols, empty_symbol = null, tape = [empty_symbol], head = 0) {
        if (!symbols.has(empty_symbol)) {
            throw `Invalid empty symbol '${empty_symbol}'`;
        }

        for (let s of tape) {
            if (!symbols.has(s)) {
                throw `Invalid initial tape symbol '${s}'`;
            }
        }

        if (head < 0 || head >= tape.length) {
            throw `Invalid initial head index ${head}`;
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
        console.log({
            "head": this.head,
            "data": this.tape
        });

        let arr = [];
        for (let x = 0; x < this.tape.length; x++) {
            let value = this.tape[x];
            if (x == this.head) {
                value += "*";
            }
            arr.push(value);
        }

        return arr;
    }
}

class TuringMachine {
    constructor(states, start, halt, symbols, empty_symbol, rules, tape = []) {
        // states validation
        const valid_states = new Set(states);

        function check_state(state, name) {
            if (!valid_states.has(state)) {
                throw `${name} state '${state}' is not valid`;
            }
        }

        // symbols validation
        const valid_symbols = new Set(symbols);

        function check_symbol(symbol, name) {
            if (!valid_symbols.has(symbol)) {
                throw `Invalid ${name} symbol '${symbol}'`;
            }
        }

        // actions validation
        const valid_head_actions = new Set(["N", "L", "R"]);

        function check_head_action(action) {
            if (!valid_head_actions.has(action)) {
                throw `Invalid action '${action}'`;
            }
        }

        // validate start and halt states
        check_state(start, "Start");
        check_state(halt, "Halt");

        // Map of current states
        this.states = new Map();

        // validate all rules and transform them
        // into a lookup table
        for (let v of rules) {
            const from_state = v[0];
            const from_symbol = v[1];
            const to_symbol = v[2];
            const head_action = v[3];
            const to_state = v[4];

            // validate states
            check_state(from_state, "Current");
            check_state(to_state, "Next");

            // validate symbols
            check_symbol(from_symbol, "Scanned");
            check_symbol(to_symbol, "Printed");

            // validate actions
            check_head_action(head_action);

            // Add to lookup table
            if (!this.states.has(from_state)) {
                this.states.set(from_state, new Map());
            }
            const from_table = this.states.get(from_state);
            if (from_table.has(from_symbol)) {
                throw `There already is a rule for state='${from_state}' symbol='${from_symbol}'`;
            }

            from_table.set(from_symbol, [
                to_state,
                to_symbol,
                head_action
            ]);
        }

        this.start = start;
        this.halt = halt;
        this.rules = rules;
        this.current = start;
        this.viz = new Viz();
        this.tape = new TuringTape(valid_symbols, empty_symbol);
    }

    advance() {
        console.log(this.tape.as_array());

        // bail out if halted
        if (this.current == this.halt) {
            return false;
        }

        // current state in lookup table
        const state = this.states.get(this.current);

        // next for current symbol
        const symbol = this.tape.head_read();
        console.log(`Read symbol ${symbol}`);

        if (!state.has(symbol)) {
            throw `No action in state '${this.current}' for read symbol '${symbol}'`;
        }

        const next = state.get(symbol);

        const to_state = next[0];
        const to_symbol = next[1];
        const head_action = next[2];

        // update symbol at head
        if (symbol != to_symbol) {
            this.tape.head_write(to_symbol);
        }

        // update head
        switch (head_action) {
            case "L":
                this.tape.head_move_left();
                break;
            case "R":
                this.tape.head_move_right();
                break;
            default:
                // do nothing
                break;
        }

        // update current state
        this.current = to_state;

        // still moving
        return true;
    }

    generateGraphString() {
        let graph = "digraph {\n";

        // list states
        for (let state of this.states.keys()) {
            graph += `  "${state}" [shape=circle];\n`;
        }

        // halt state has a special shape
        graph += `  "${this.halt}" [shape=doublecircle];\n`;

        // add extra start state
        graph += `  "start" [shape=none];\n`;
        graph += `  "start" -> "${this.start}";\n`;

        // current state
        graph += `  "${this.current}" [fillcolor=lightgray, style=filled];\n`;

        // go over rules
        for (let rule of this.rules) {
            const from_state = rule[0];
            const from_symbol = rule[1];
            const to_symbol = rule[2];
            const head_action = rule[3];
            const to_state = rule[4];
            graph += `  "${from_state}" -> "${to_state}" [label="${from_symbol} / ${to_symbol}, ${head_action}"];\n`;
        }


        graph += "}";
        return graph;
    }

    renderGraph() {
        const graph = this.generateGraphString();
        return new Promise((resolve, reject) => {
            this.viz.renderSVGElement(graph)
                .then(element => {
                    resolve(element);
                })
                .catch(error => {
                    // Create a new Viz instance (@see Caveats page for more info)
                    this.viz = new Viz();
                    console.log(graph);
                    reject(error);
                });
        });
    }
}