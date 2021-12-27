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

        console.log(this.states);
    }
}