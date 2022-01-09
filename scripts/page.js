var machine = null;
var animation = null;

function set_contents(element, contents) {
    while (element.lastElementChild) {
        element.removeChild(element.lastElementChild);
    }
    element.appendChild(contents);
}

function run_turing_machine_file() {
    const file_input = document.getElementById("file");

    const f = file_input.files[0];
    if (f) {
        const reader = new FileReader();
        reader.onload = (evt_reader) => {
            // parse JSON
            const j = JSON.parse(evt_reader.target.result);
            machine = new TuringMachine(
                j.states, j.start, j.halt,
                j.symbols, j.empty_symbol,
                j.rules);

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
            })
            .catch(error => {
                console.error(error);
            });

        if (!machine.advance()) {
            clearInterval(animation);
        }
    }

    clearInterval(animation);
    animation = setInterval(render_machine, 100);
}