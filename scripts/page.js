var machine = null;

function on_turing_json_selected(file_input) {
    const f = file_input.files[0];
    if (f) {
        const reader = new FileReader();

        reader.onload = function(evt_reader) {
            // parse JSON
            const j = JSON.parse(evt_reader.target.result);
            machine = new TuringMachine(
                j.states, j.start, j.halt,
                j.symbols, j.empty_symbol,
                j.rules);

            function set_contents(element, contents) {
                while (element.lastElementChild) {
                    element.removeChild(element.lastElementChild);
                }
                element.appendChild(contents);
            }

            const machine_div = document.getElementById("machine");
            const tape_div = document.getElementById("tape");

            function update_machine(graph, tape) {
                set_contents(machine_div, graph);
                set_contents(tape_div, tape);
                setTimeout(render_machine, 1000);
            }

            function render_machine() {
                if (machine.advance()) {
                    machine.renderGraph()
                        .then((graph) => {
                            const tape = machine.renderTape();
                            update_machine(graph, tape);
                        })
                        .catch(error => {
                            console.error(error);
                        });
                }
            }

            machine.renderGraph()
                .then((graph) => {
                    const tape = machine.renderTape();
                    update_machine(graph, tape);
                })
                .catch(error => {
                    console.error(error);
                });
        };

        reader.readAsText(f);
    }
}