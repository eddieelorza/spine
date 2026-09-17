import { T } from '../lang';

export function FactsSection() {
  return (
    <section>
      <h2>
        <T es="v0.1, sin maquillaje" en="v0.1, no gloss" />
      </h2>

      <div className="facts">
        <div className="facts-col ok">
          <h4>
            <T es="Sí funciona hoy" en="Works today" />
          </h4>
          <ul>
            <li>
              <T
                es={<><b>product why / check / status / context</b> — cero llamadas a un modelo</>}
                en={<><b>product why / check / status / context</b> — zero calls to a model</>}
              />
            </li>
            <li>
              <T
                es={<><b>4 agentes</b> compilados a subagentes + slash commands</>}
                en={<><b>4 agents</b> compiled into subagents + slash commands</>}
              />
            </li>
            <li>
              <T
                es={<><b>15 reglas de validación</b>, cada una con su fixture</>}
                en={<><b>15 validation rules</b>, each with its own fixture</>}
              />
            </li>
            <li>
              <T es={<><b>77 tests</b>, node --test nativo</>} en={<><b>77 tests</b>, native node --test</>} />
            </li>
            <li>
              <T
                es={<><b>7 escenarios adversariales</b> contra inyección e invención</>}
                en={<><b>7 adversarial scenarios</b> against injection and fabrication</>}
              />
            </li>
          </ul>
        </div>
        <div className="facts-col no">
          <h4>
            <T es="Todavía no" en="Not yet" />
          </h4>
          <ul>
            <li>
              <T
                es="Interfaz gráfica — es CLI + Markdown a propósito"
                en="Graphical interface — it's CLI + Markdown on purpose"
              />
            </li>
            <li>
              <T es="Publicado en npm — instálalo desde el código fuente" en="Published on npm — install it from source" />
            </li>
            <li>
              <T
                es="Adaptador para Codex, Cursor o Gemini CLI — el contrato ya es neutral"
                en="Adapter for Codex, Cursor or Gemini CLI — the contract is already neutral"
              />
            </li>
            <li>
              <T
                es={<><code>DEC</code> antes de que exista una <code>US</code> aceptada</>}
                en={<><code>DEC</code> before an accepted <code>US</code> exists</>}
              />
            </li>
            <li>
              <T
                es="Roadmap, priorización, personas, analytics — excluidos de v0.1"
                en="Roadmap, prioritization, personas, analytics — excluded from v0.1"
              />
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
}
