function is_empty(v) {
    return v == "" || v === undefined || v == null;
}

class TuringMachine {
    constructor(config) {
        function required_parameter(name) {
            if (!(name in config)) {
                throw `Required parameter '${name}' not specified in config`;
            }

            if (is_empty(config[name])) {
                throw `Required parameter '${name}' is empty`;
            }

            return config[name];
        }

        function optional_parameter(name, def) {
            if (name in config && !is_empty(config[name])) {
                return config[name];
            }

            return def;
        }

        const states = required_parameter("states");
        const start = required_parameter("start");
        const symbols = required_parameter("symbols");
        const empty_symbol = required_parameter("empty_symbol");
        const rules = required_parameter("rules");

        const halt = optional_parameter("halt", null);
        const tape = optional_parameter("tape", [empty_symbol]);
        const head = optional_parameter("head", 0);

        // states validation
        const valid_states = new Set(states);

        function check_state(state, name, required = true) {
            if (!required && is_empty(state)) {
                // not required and not passed
                return;
            }

            if (!valid_states.has(state)) {
                throw `${name} state '${state}' is not valid. Choose from: ${Array.from(valid_states).join(", ")}`;
            }
        }

        // symbols validation
        const valid_symbols = new Set(symbols);

        function check_symbol(symbol, name) {
            if (!valid_symbols.has(symbol)) {
                throw `Invalid ${name} symbol '${symbol}'. Choose from: ${Array.from(valid_symbols).join(", ")}`;
            }
        }

        // actions validation
        const valid_head_actions = new Set(["N", "L", "R"]);

        function check_head_action(action) {
            if (!valid_head_actions.has(action)) {
                throw `Invalid action '${action}'. Choose from: ${Array.from(valid_head_actions).join(", ")}`;
            }
        }

        // validate start and halt states
        check_state(start, "Start");
        check_state(halt, "Halt", false);

        // validate empty symbol
        check_symbol(empty_symbol, "Empty");

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
        this.empty_symbol = empty_symbol;
        this.rules = rules;
        this.current = start;
        this.viz = new Viz();
        this.tape = new TuringTape(valid_symbols, empty_symbol, tape, head);

        // sub-operations
        this.operation = "normal";
        this.read_symbol = tape[head];
        this.head_op = "^";
        this.op_counter = 1;
    }

    advance() {
        if (this.operation == "move_state") {
            this.operation = "normal";
            this.op_counter++;
            return true;
        }

        // bail out if halted
        if (this.current == this.halt) {
            if (this.operation != "halted") {
                this.operation = "halted";
                return true;
            }

            return false;
        }

        // current state in lookup table
        const state = this.states.get(this.current);

        if (this.operation == "normal") {
            this.operation = "read_state";
            this.read_symbol = null;
            return true;
        }

        // next for current symbol
        const symbol = this.tape.head_read();
        if (this.operation == "read_state") {
            this.read_symbol = symbol;
            this.operation = "read_symbol";
            return true;
        }

        if (!state.has(this.read_symbol)) {
            throw `No action in state '${this.current}' for read symbol '${symbol}'`;
        }

        const next = state.get(this.read_symbol);

        const to_state = next[0];
        const to_symbol = next[1];
        const head_action = next[2];

        if (this.operation == "read_symbol") {
            this.operation = "clear_symbol";
            return true;
        }

        if (this.operation == "clear_symbol") {
            // update symbol at head
            this.tape.head_write(to_symbol);
            this.operation = "write_symbol";
            return true;
        }

        if (this.operation == "write_symbol") {
            // update head visuals
            switch (head_action) {
                case "L":
                    this.head_op = "<";
                    break;
                case "R":
                    this.head_op = ">";
                    break;
                default:
                    this.head_op = "-";
                    break;
            }

            this.operation = "move_head";
            return true;
        }

        if (this.operation == "move_head") {
            // update head
            switch (head_action) {
                case "L":
                    this.tape.head_move_left();
                    break;
                case "R":
                    this.tape.head_move_right();
                    break;
                default:
                    break;
            }

            this.operation = "moved_head";
            return true;
        }

        // update current state
        this.current = to_state;
        this.operation = "move_state";
        this.head_op = "^";

        // still moving
        return true;
    }

    generateGraphString() {
        let graph = "digraph {\n";

        // list states
        for (let state of this.states.keys()) {
            graph += `  "${state}" [shape=circle];\n`;
        }

        // only add halt state if it is there
        if (!is_empty(this.halt)) {
            // halt state has a special shape
            graph += `  "${this.halt}" [shape=doublecircle];\n`;
        }

        // add extra start state
        graph += `  "start" [shape=none];\n`;
        graph += `  "start" -> "${this.start}";\n`;

        // current state
        const state_colors = new Map([
            ["normal", "lightgrey"],
            ["halted", "orangered"],
            ["read_state", "green"],
            ["read_symbol", "green"],
            ["clear_symbol", "green"],
            ["write_symbol", "green"],
            ["move_head", "green"],
            ["moved_head", "green"],
            ["move_state", "yellow"]
        ]);

        let state_color = state_colors.get(this.operation);
        graph += `  "${this.current}" [fillcolor=${state_color}, style=filled];\n`;

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

    renderTape() {
        // show tape array
        // show head index

        // create container
        let container = document.createElement("div");
        container.className = "tape";

        // an generic item
        const item = document.createElement("div");
        item.className = "symbol";

        // an empty item
        const empty_item = item.cloneNode();
        empty_item.innerText = this.empty_symbol;

        // add initial empty symbol
        container.appendChild(empty_item.cloneNode(true));

        // add all symbols
        const symbols = this.tape.as_array();
        for (let x = 0; x < symbols.length; x++) {
            const symbol = symbols[x];
            const i = item.cloneNode();
            i.innerText = symbol;

            if (x == this.tape.head_index()) {
                switch (this.operation) {
                    case "read_symbol":
                    case "clear_symbol":
                    case "write_symbol":
                        i.classList.add(this.operation);
                        break;
                    default:
                        // nothing
                        break;
                }
            }
            container.appendChild(i);
        }

        // add last empty symbol
        container.appendChild(empty_item.cloneNode(true));

        // add tape head
        const head = document.createElement("div");
        head.innerText = this.head_op;
        if (symbols.length > 0) {
            // at least one item
            head.className = "head";
            // column index is not zero based, add +1
            // there always is an "empty cell" to the left, add +1
            const column = this.tape.head_index() + 2;
            head.setAttribute("style", `grid-column: ${column}`);
        } else {
            // empty
            head.className = "head empty_head";
        }
        container.appendChild(head);

        return container;
    }

    render_operation() {
        const state_descriptions = new Map([
            ["normal", "At state"],
            ["halted", "Halted"],
            ["read_state", "Read current state"],
            ["read_symbol", "Read current symbol"],
            ["clear_symbol", "Cleared symbol"],
            ["write_symbol", "Wrote symbol"],
            ["move_head", "Moving head"],
            ["moved_head", "Head moved"],
            ["move_state", "Going to next state"]
        ]);

        // create container
        const container = document.createElement("div");
        container.className = "operation";

        const counter = document.createElement("div");
        counter.className = "counter";
        counter.innerText = this.op_counter;

        const description = document.createElement("div");
        description.className = `desc ${this.operation}`;
        description.innerText = state_descriptions.get(this.operation);

        container.appendChild(counter);
        container.appendChild(description);

        return container;
    }

    render_rules() {
        // create container
        const container = document.createElement("table");
        container.className = "rules";

        const header = document.createElement("tr");
        container.appendChild(header);

        const from_state_th = document.createElement("th");
        from_state_th.innerText = "Current state";
        header.appendChild(from_state_th);

        const from_symbol_th = document.createElement("th");
        from_symbol_th.innerText = "Scanned symbol";
        header.appendChild(from_symbol_th);

        const to_symbol_th = document.createElement("th");
        to_symbol_th.innerText = "Print symbol";
        header.appendChild(to_symbol_th);

        const head_action_th = document.createElement("th");
        head_action_th.innerText = "Move tape";
        header.appendChild(head_action_th);

        const to_state_th = document.createElement("th");
        to_state_th.innerText = "Next state";
        header.appendChild(to_state_th);

        for (let rule of this.rules) {
            const from_state = rule[0];
            const from_symbol = rule[1];
            const to_symbol = rule[2];
            const head_action = rule[3];
            const to_state = rule[4];

            const row = document.createElement("tr");
            container.appendChild(row);

            const from_state_td = document.createElement("td");
            from_state_td.innerText = from_state;
            row.appendChild(from_state_td);

            const from_symbol_td = document.createElement("td");
            from_symbol_td.innerText = from_symbol;
            row.appendChild(from_symbol_td);

            const to_symbol_td = document.createElement("td");
            to_symbol_td.innerText = to_symbol;
            row.appendChild(to_symbol_td);

            const head_action_td = document.createElement("td");
            head_action_td.innerText = head_action;
            row.appendChild(head_action_td);

            const to_state_td = document.createElement("td");
            to_state_td.innerText = to_state;
            row.appendChild(to_state_td);

            if (from_state == this.current) {
                if (this.read_symbol != null && this.read_symbol == from_symbol) {
                    // from state cell
                    switch (this.operation) {
                        case "read_symbol":
                            from_symbol_td.className = "read_state";
                            break;
                        case "clear_symbol":
                        case "write_symbol":
                        case "move_head":
                        case "moved_head":
                            from_symbol_td.className = "clear_symbol";
                            break;
                    }

                    // to symbol cell
                    switch (this.operation) {
                        case "write_symbol":
                        case "move_head":
                        case "moved_head":
                            to_symbol_td.className = "write_symbol";
                            break;
                    }

                    // set row
                    switch (this.operation) {
                        case "move_head":
                            row.className = "move_head";
                            break;
                        case "moved_head":
                            row.className = "moved_head";
                            break;
                        case "move_state":
                            row.className = "move_state";
                            break;
                        case "normal":
                            row.className = "normal";
                            break;
                        default:
                            row.className = "current";
                            break;
                    }
                } else if (this.read_symbol == null) {
                    row.className = "current";
                }
            }
        }

        // add halt rule
        const halt_row = document.createElement("tr");
        container.appendChild(halt_row);

        if (this.current == this.halt) {
            switch (this.operation) {
                case "halted":
                    halt_row.className = "halted";
                    break;
                default:
                    halt_row.className = "normal";
                    break;
            }
        }

        if (this.halt !== undefined && this.halt !== null) {
            const halt_td = document.createElement("td");
            halt_td.innerText = this.halt;
            halt_td.colSpan = 5;
            halt_row.appendChild(halt_td);
        }

        return container;
    }
}