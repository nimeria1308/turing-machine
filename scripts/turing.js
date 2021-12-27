class TuringMachine {
    constructor(states, start, halt, symbols, rules) {
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
        this.viz = new Viz();
    }

    generateGraphString() {
        let graph = "digraph {\n";

        // list states
        for (let state of this.states.keys()) {
            graph += `  "${state}";\n`;
        }

        // halt state has a special shape
        graph += `  "${this.halt}" [shape="doublecircle"];\n`;

        // add extra start state
        graph += `  "start" [shape="none"];\n`;
        graph += `  "start" -> "${this.start}";\n`;

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

    renderSVGElement() {
        const graph = this.generateGraphString();
        return new Promise((resolve, reject) => {
            this.viz.renderSVGElement(graph)
                .then(element => {
                    resolve(element);
                })
                .catch(error => {
                    // Create a new Viz instance (@see Caveats page for more info)
                    viz = new Viz();
                    reject(error);
                });
        });
    }
}