var machine = null;
var animation = null;
var preview = null;

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

var filename = "turing_machine.json";

function file_changed(file) {
    const f = file.files[0];
    if (f) {
        const source = document.getElementById("machine_source");
        if (confirm("Are you sure you want to replace the loaded machine?")) {
            const reader = new FileReader();
            reader.onload = (event) => {
                filename = f.name;

                try {
                    // parse JSON
                    const config = JSON.parse(event.target.result);

                    if (!("start" in config)) {
                        throw `"start" key missing in '${f.name}'`;
                    }
                    const start = document.getElementById("machine_start");
                    start.value = config.start;

                    // optional
                    const halt = document.getElementById("machine_halt");
                    halt.value = ("halt" in config) ? config.halt : "";

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

function config_from_inputs() {
    const start_input = document.getElementById("machine_start");
    const halt_input = document.getElementById("machine_halt");
    const empty_symbol_input = document.getElementById("machine_empty_symbol");
    const tape_input = document.getElementById("machine_tape");
    const rules_input = document.getElementById("machine_rules");

    // load values from HTML form
    const config = {};

    config.rules = [];
    for (let rule of rules_input.value.split("\n")) {
        if (rule != "") {
            config.rules.push(rule.split(","));
        }
    }

    config.start = start_input.value;
    config.empty_symbol = empty_symbol_input.value;

    // optional
    if (halt_input.value) {
        config.halt = halt_input.value;
    }

    if (tape_input.value) {
        config.tape = tape_input.value.split(",");
    }

    return config;
}

function save_machine() {
    try {
        const config = config_from_inputs();

        filename = prompt("Enter filename for turing machine", filename);

        if (!filename.endsWith(".json")) {
            filename = filename + ".json";
        }

        // Generate JSON
        const text = JSON.stringify(config, null, 4);

        const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
        saveAs(blob, filename);
    } catch (e) {
        show_error_dialog(e);
    }
}

function launch_machine() {
    try {
        const config = config_from_inputs();
        machine = new TuringMachine(config);

        // all is well, hide the configuration window
        run_turing_machine();
    } catch (e) {
        show_error_dialog(e);
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

function schedule_preview() {
    if (preview != null) {
        clearTimeout(preview);
        preview = null;
    }

    preview = setTimeout(() => {
        const machine_div = document.getElementById("machine_preview");

        try {
            const config = config_from_inputs();

            try {
                const preview_machine = new TuringMachine(config);
                preview_machine.renderGraph()
                    .then((graph) => {
                        set_contents(machine_div, graph);
                    })
                    .catch(error => {
                        console.error(error);
                    });

                // rendered without errors
            } catch (e) {
                // try rendering without validation
                try {
                    const preview_machine_no_validate = new TuringMachine(config, false);
                    preview_machine_no_validate.renderGraph()
                        .then((graph) => {
                            set_contents(machine_div, graph);
                        })
                        .catch(error => {
                            console.error(error);
                        });
                } catch (e) {
                    // could not render preview without validation
                    show_error_dialog(e);
                }
            }
        } catch (e) {
            // failed parsing config
            show_error_dialog(e);
        }
    }, 100);
}