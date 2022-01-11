var machine = null;
var animation = null;

function set_contents(element, contents) {
    while (element.lastElementChild) {
        element.removeChild(element.lastElementChild);
    }
    element.appendChild(contents);
}

function show_error_dialog(error) {
    const modal_element = document.getElementById("modal_error");
    const modal = new bootstrap.Modal(modal_element);
    const modal_message = document.getElementById("modal_error_message");
    modal_message.innerText = error;
    console.log(error);
    modal.show();
}

function file_changed(file) {
    const f = file.files[0];
    if (f) {
        const source = document.getElementById("machine_source");
        if (confirm("Are you sure you want to replace the loaded machine?")) {
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    // parse JSON
                    const config = JSON.parse(event.target.result);

                    if (!("states" in config)) {
                        throw `"states" key missing in '${f.name}'`;
                    }
                    const states = document.getElementById("machine_states");
                    states.value = config.states;

                    if (!("start" in config)) {
                        throw `"start" key missing in '${f.name}'`;
                    }
                    const start = document.getElementById("machine_start");
                    start.value = config.start;

                    // optional
                    const halt = document.getElementById("machine_halt");
                    halt.value = ("halt" in config) ? config.halt : "";

                    if (!("symbols" in config)) {
                        throw `"symbols" key missing in '${f.name}'`;
                    }
                    const symbols = document.getElementById("machine_symbols");
                    symbols.value = config.symbols;

                    if (!("empty_symbol" in config)) {
                        throw `"empty_symbol" key missing in '${f.name}'`;
                    }
                    const empty_symbol = document.getElementById("machine_empty_symbol");
                    empty_symbol.value = config.empty_symbol;

                    // optional
                    const tape = document.getElementById("machine_tape");
                    tape.value = ("tape" in config) ? config.tape : "";

                    if (!("rules" in config)) {
                        throw `"rules" key missing in '${f.name}'`;
                    }
                    const rules = document.getElementById("machine_rules");
                    rules.value = config.rules.join("\n");
                } catch (e) {
                    show_error_dialog(e);
                }
            };
            reader.readAsText(f);
        }
    }
}

function launch_machine() {
    // validate
    try {
        const states_input = document.getElementById("machine_states");
        const start_input = document.getElementById("machine_start");
        const halt_input = document.getElementById("machine_halt");
        const symbols_input = document.getElementById("machine_symbols");
        const empty_symbol_input = document.getElementById("machine_empty_symbol");
        const tape_input = document.getElementById("machine_tape");
        const rules_input = document.getElementById("machine_rules");

        // load values from HTML form
        const config = {};
        config.states = states_input.value.split(",");
        config.start = start_input.value;
        config.symbols = symbols_input.value.split(",");
        config.empty_symbol = empty_symbol_input.value;

        config.rules = [];
        for (let rule of rules_input.value.split("\n")) {
            config.rules.push(rule.split(","));
        }

        // optional
        if (halt_input.value) {
            config.halt = halt_input.value;
        }

        if (tape_input.value) {
            config.tape = tape_input.value.split(",");
        }

        machine = new TuringMachine(config);

        // all is well, hide the configuration window

        run_turing_machine();

    } catch (e) {
        show_error_dialog(e);
    }
}

function run_turing_machine_file() {
    const file_input = document.getElementById("file");

    const f = file_input.files[0];
    if (f) {
        const reader = new FileReader();
        reader.onload = (evt_reader) => {
            // parse JSON
            const config = JSON.parse(evt_reader.target.result);
            machine = new TuringMachine(config);
            run_turing_machine();
        };

        reader.readAsText(f);
    }
}

function run_turing_machine() {
    const machine_div = document.getElementById("machine");
    const tape_div = document.getElementById("tape");
    const operation_div = document.getElementById("operation");
    const rules_div = document.getElementById("rules");

    function render_machine() {
        machine.renderGraph()
            .then((graph) => {
                set_contents(machine_div, graph);
                set_contents(tape_div, machine.renderTape());
                set_contents(operation_div, machine.render_operation());
                set_contents(rules_div, machine.render_rules());

                if (!machine.advance()) {
                    clearInterval(animation);
                }
            })
            .catch(error => {
                console.error(error);
            });
    }

    clearInterval(animation);
    animation = setInterval(render_machine, 100);
}