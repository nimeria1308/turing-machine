function is_empty(v) {
    return v == "" || v === undefined || v == null;
}

function transform_symbol(s) {
    switch (s) {
        case " ":
            return "\u2294"
        default:
            return s;
    }
}

class TuringMachine {
    constructor(config, validate = true) {
        function required_parameter(name) {
            if (!(name in config) && validate) {
                throw `Required parameter '${name}' not specified in config`;
            }

            if (is_empty(config[name]) && validate) {
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

        const start = required_parameter("start");
        const empty_symbol = required_parameter("empty_symbol");
        const rules = required_parameter("rules");

        const halt = optional_parameter("halt", []);
        const tape = optional_parameter("tape", [empty_symbol]);
        const head = optional_parameter("head", 0);

        // states and symbols are generated from the rules
        const states = new Set();

        // symbols are generated from the rules
        const symbols = new Set();

        // actions validation
        const valid_head_actions = new Set(["N", "L", "R"]);

        function check_head_action(action) {
            if (!valid_head_actions.has(action) && validate) {
                throw `Invalid action '${action}'. Choose from: ${Array.from(valid_head_actions).join(", ")}`;
            }
        }

        // add start to set of states
        states.add(start);

        // add halt states to set of states if present
        for (let h of halt) {
            states.add(h);
        }

        // add empty symbol to list of symbols
        symbols.add(empty_symbol);

        // Map of current states
        this.state_map = new Map();

        // validate all rules and transform them
        // into a lookup table
        for (let v of rules) {
            const from_state = v[0];
            const from_symbol = v[1];
            const to_symbol = v[2];
            const head_action = v[3];
            const to_state = v[4];

            // validate actions
            check_head_action(head_action);

            // validate rules
            if (validate) {
                if (is_empty(from_state)) {
                    throw `From state for rule '${v}' is empty`;
                }

                if (is_empty(to_state)) {
                    throw `To state for rule '${v}' is empty`;
                }

                if (is_empty(from_symbol)) {
                    throw `From symbol for rule '${v}' is empty`;
                }

                if (is_empty(to_symbol)) {
                    throw `To symbol for rule '${v}' is empty`;
                }

                // to simplify visual input in index.html,
                // require symbols are 1 character long
                if ((from_symbol + "").length != 1) {
                    throw `From symbol '${from_symbol}' for rule '${v}' must be 1 charater long`;
                }
                if ((to_symbol + "").length != 1) {
                    throw `To symbol '${to_symbol}' for rule '${v}' must be 1 charater long`;
                }
            }

            // Add to lookup table
            if (!this.state_map.has(from_state)) {
                this.state_map.set(from_state, new Map());
            }

            const from_table = this.state_map.get(from_state);
            if (from_table.has(from_symbol) && validate) {
                throw `There already is a rule for state='${from_state}' symbol='${from_symbol}'`;
            }

            from_table.set(from_symbol, [
                to_state,
                to_symbol,
                head_action
            ]);

            function add_if_not_empty(where, what) {
                if (!is_empty(what)) {
                    where.add(what);
                }
            }

            // add states from to rule to set of states (if not empty)
            add_if_not_empty(states, from_state);
            add_if_not_empty(states, to_state);

            // add symbols from rule to set of symbols (if not empty)
            add_if_not_empty(symbols, from_symbol);
            add_if_not_empty(symbols, to_symbol);
        }

        this.states = states;
        this.start = start;
        this.halt = new Set(halt);
        this.symbols = symbols;
        this.empty_symbol = empty_symbol;
        this.rules = rules;
        this.viz = new Viz();
        this.initial_tape = tape;
        this.initial_head = head;

        this.reset();
    }

    reset() {
        // reset state
        this.current = this.start;

        // initialize tape
        this.tape = new TuringTape(this.empty_symbol, this.initial_tape, this.initial_head);

        // sub-operations
        this.operation = "normal";
        this.read_symbol = this.initial_tape[this.initial_head];
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
        if (this.halt.has(this.current)) {
            if (this.operation != "halted") {
                this.operation = "halted";
                return true;
            }

            return false;
        }

        // current state in lookup table
        if (!this.state_map.has(this.current)) {
            throw `No rules for current state '${this.current}'`;
        }

        const state = this.state_map.get(this.current);

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
        for (let state of this.states) {
            graph += `  "${state}" [shape=circle];\n`;
        }

        // only add halt state if it is there
        for (let h of this.halt) {
            // halt state has a special shape
            graph += `  "${h}" [shape=doublecircle];\n`;
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
            let from_state = rule[0];
            let from_symbol = rule[1];
            let to_symbol = rule[2];
            let head_action = rule[3];
            let to_state = rule[4];

            // graph rule template
            // <from_state> -> <to_state> [label="<from symbol> / <to symbol> [[<head action>]]"]

            // handle non-valid rules for preview,
            // so that it doesn't say "undefined" all over the place

            const has_state = !is_empty(from_state) || !is_empty(to_state);
            const has_both_states = !is_empty(from_state) && !is_empty(to_state);
            const has_symbols = !is_empty(from_symbol) || !is_empty(to_symbol);
            const has_head_action = !is_empty(head_action);
            const has_label = has_symbols || has_head_action;

            // only consider showing on graph if:
            //   - both states are there
            //   - at least one state is there and there is a label
            if (has_both_states || (has_state && has_label)) {
                from_state = is_empty(from_state) ? "?" : from_state;
                to_state = is_empty(to_state) ? "?" : to_state;

                // add the "from -> to" to the grah
                graph += `  "${from_state}" -> "${to_state}"`;

                if (has_label) {
                    const label = [];
                    const from_to_symbols_same = (from_symbol === to_symbol);
                    from_symbol = is_empty(from_symbol) ? "?" : transform_symbol(from_symbol);
                    to_symbol = is_empty(to_symbol) ? "?" : transform_symbol(to_symbol);

                    label.push(`${from_symbol} \u2192`);

                    if (!from_to_symbols_same) {
                        label.push(`${to_symbol},`);
                    }

                    if (has_head_action) {
                        head_action = is_empty(head_action) ? "?" : head_action;
                        label.push(head_action);
                    }

                    graph += ` [label="${label.join(' ')}"]`;
                }

                graph += ';\n';
            }
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
        container.className = "rules table";

        const thead = document.createElement("thead");
        container.appendChild(thead);

        const header = document.createElement("tr");
        thead.appendChild(header);

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

        const tbody = document.createElement("tbody");
        container.appendChild(tbody);

        for (let rule of this.rules) {
            const from_state = rule[0];
            const from_symbol = rule[1];
            const to_symbol = rule[2];
            const head_action = rule[3];
            const to_state = rule[4];

            const row = document.createElement("tr");
            tbody.appendChild(row);

            const from_state_td = document.createElement("td");
            from_state_td.innerText = from_state;
            row.appendChild(from_state_td);

            const from_symbol_td = document.createElement("td");
            from_symbol_td.innerText = transform_symbol(from_symbol);
            row.appendChild(from_symbol_td);

            const to_symbol_td = document.createElement("td");
            to_symbol_td.innerText = transform_symbol(to_symbol);
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
        for (let h of this.halt) {
            const halt_row = document.createElement("tr");
            tbody.appendChild(halt_row);

            if (this.current == h) {
                switch (this.operation) {
                    case "halted":
                        halt_row.className = "halted";
                        break;
                    default:
                        halt_row.className = "normal";
                        break;
                }
            }

            const halt_td = document.createElement("td");
            halt_td.innerText = h;
            halt_td.colSpan = 5;
            halt_row.appendChild(halt_td);
        }

        return container;
    }
}