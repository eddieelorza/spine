import { T } from '../lang';
import { Step } from './Step';
import { TerminalBlock } from './TerminalBlock';

const C = ({ children }: { children: React.ReactNode }) => <span className="c">{children}</span>;

export function InstallSection() {
  return (
    <section id="instalar">
      <h2>
        <T
          es="No necesitas saber programar ni tener un proyecto de código"
          en="You don't need to know how to code, or have an existing project"
        />
      </h2>
      <p className="section-lede">
        <T
          es={
            <>
              &ldquo;Repo&rdquo; aquí no significa proyecto de software — significa{' '}
              <b>una carpeta con control de versiones</b>. Si eres de producto y no tienes ningún código, igual
              puedes tener una: se crea con un solo comando y queda vacía, solo con tu idea adentro. Todo este
              recorrido usa el mismo ejemplo de principio a fin.
            </>
          }
          en={
            <>
              &ldquo;Repo&rdquo; here doesn't mean a software project — it means <b>a folder under version control</b>.
              If you're on the product side with no code at all, you can still have one: it's created with a single
              command and starts empty, with just your idea inside. This whole walkthrough uses the same example
              start to finish.
            </>
          }
        />
      </p>

      <div className="prereq">
        <h4>
          <T es="Antes de empezar, necesitas tres cosas" en="Before you start, you need three things" />
        </h4>
        <ul>
          <li>
            <T
              es={<><b>Node.js 20 o más nuevo</b> instalado en tu máquina.</>}
              en={<><b>Node.js 20 or newer</b> installed on your machine.</>}
            />
          </li>
          <li>
            <T
              es={<><b>git</b> instalado (viene por defecto en Mac; en Windows, Git for Windows).</>}
              en={<><b>git</b> installed (ships by default on Mac; on Windows, Git for Windows).</>}
            />
          </li>
          <li>
            <T
              es={
                <>
                  <b>Claude Code</b> instalado y abierto — los <code>/product:*</code> solo existen ahí, no en la app
                  normal de Claude ni en claude.ai.
                </>
              }
              en={
                <>
                  <b>Claude Code</b> installed and open — <code>/product:*</code> only exists there, not in the
                  regular Claude app or on claude.ai.
                </>
              }
            />
          </li>
        </ul>
        <p className="note">
          <T
            es={
              <>
                Si ya tienes Claude Code abierto y puedes escribir comandos en su terminal, tienes todo lo que hace
                falta. No hace falta VS Code, no hace falta un framework, no hace falta saber qué es un{' '}
                <code style={{ fontSize: 11 }}>git commit</code>.
              </>
            }
            en={
              <>
                If you already have Claude Code open and can type commands in its terminal, you have everything you
                need. No VS Code, no framework, no need to know what a <code style={{ fontSize: 11 }}>git commit</code>{' '}
                is.
              </>
            }
          />
        </p>
      </div>

      <p className="running-example">
        <T
          es={<>Ejemplo que corre en todos los pasos · <b>SplitPay</b> — dividir la cuenta en grupo</>}
          en={<>Example running through every step · <b>SplitPay</b> — splitting the bill as a group</>}
        />
      </p>

      <div className="steps">
        <Step n={0}>
          <h3>
            <T es="Instala Claude Code, si todavía no lo tienes" en="Install Claude Code, if you don't have it yet" />
          </h3>
          <p>
            <T
              es={
                <>
                  Necesitas cuenta <b>Pro, Max, Team, Enterprise o Console</b> — el plan gratis de claude.ai no
                  incluye Claude Code. Elige tu sistema:
                </>
              }
              en={
                <>
                  You need a <b>Pro, Max, Team, Enterprise or Console</b> account — the free claude.ai plan doesn't
                  include Claude Code. Pick your system:
                </>
              }
            />
          </p>
          <T
            es={
              <TerminalBlock
                className="cmd"
                lines={[
                  <C># macOS, Linux o WSL</C>,
                  'curl -fsSL https://claude.ai/install.sh | bash',
                  <>&nbsp;</>,
                  <C># Windows, en PowerShell</C>,
                  'irm https://claude.ai/install.ps1 | iex',
                ]}
              />
            }
            en={
              <TerminalBlock
                className="cmd"
                lines={[
                  <C># macOS, Linux or WSL</C>,
                  'curl -fsSL https://claude.ai/install.sh | bash',
                  <>&nbsp;</>,
                  <C># Windows, in PowerShell</C>,
                  'irm https://claude.ai/install.ps1 | iex',
                ]}
              />
            }
          />
          <p style={{ marginTop: 14 }}>
            <T es="Después, en cualquier terminal:" en="Then, in any terminal:" />
          </p>
          <T
            es={
              <TerminalBlock
                className="cmd"
                lines={[
                  <>
                    claude &nbsp;&nbsp;<C># abre una sesión y te pide iniciar sesión en el navegador</C>
                  </>,
                ]}
              />
            }
            en={
              <TerminalBlock
                className="cmd"
                lines={[
                  <>
                    claude &nbsp;&nbsp;<C># opens a session and asks you to sign in via your browser</C>
                  </>,
                ]}
              />
            }
          />
          <p style={{ marginTop: 14 }}>
            <T
              es="Se abre tu navegador, inicias sesión con tu cuenta de Claude, y listo — ya puedes escribir dentro de esa ventana de terminal."
              en="Your browser opens, you sign in with your Claude account, and that's it — you can now type inside that terminal window."
            />
          </p>
        </Step>

        <Step n={1}>
          <h3>
            <T es="Instala la herramienta — una sola vez, nunca más" en="Install the tool — once, never again" />
          </h3>
          <p>
            <T
              es="Esto no es tu producto. Es la herramienta en sí, y vive en su propia carpeta, separada de todo lo demás que hagas."
              en="This isn't your product. It's the tool itself, and it lives in its own folder, separate from anything else you do."
            />
          </p>
          <T
            es={
              <TerminalBlock
                className="cmd"
                lines={[
                  <C># en cualquier carpeta, una sola vez</C>,
                  'git clone <url> ai-product-os',
                  'cd ai-product-os',
                  'npm install',
                  'npm run build',
                  <>
                    npm link &nbsp;&nbsp;<C># deja el comando "product" disponible en toda tu máquina</C>
                  </>,
                ]}
              />
            }
            en={
              <TerminalBlock
                className="cmd"
                lines={[
                  <C># in any folder, once</C>,
                  'git clone <url> ai-product-os',
                  'cd ai-product-os',
                  'npm install',
                  'npm run build',
                  <>
                    npm link &nbsp;&nbsp;<C># makes the "product" command available on your whole machine</C>
                  </>,
                ]}
              />
            }
          />
        </Step>

        <Step n={2}>
          <h3>
            <T es="Crea la carpeta de TU idea" en="Create the folder for YOUR idea" />
          </h3>
          <p>
            <T
              es="Esta es la parte que confunde: no reutilizas la carpeta de arriba. Creas una nueva, vacía, para tu producto — sin importar que no tengas ni una línea de código todavía."
              en="This is the confusing part: you don't reuse the folder above. You create a new, empty one for your product — even if you don't have a single line of code yet."
            />
          </p>
          <T
            es={
              <TerminalBlock
                className="cmd"
                lines={[
                  <C># en cualquier otro lugar, por ejemplo tu carpeta de Documentos</C>,
                  'mkdir splitpay',
                  'cd splitpay',
                  <>
                    git init &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                    <C># esta carpeta ya es tu "repo"</C>
                  </>,
                  <>
                    product init --name "SplitPay" &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<C># crea .product/ y product/ adentro</C>
                  </>,
                ]}
              />
            }
            en={
              <TerminalBlock
                className="cmd"
                lines={[
                  <C># anywhere else, e.g. your Documents folder</C>,
                  'mkdir splitpay',
                  'cd splitpay',
                  <>
                    git init &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                    <C># this folder is now your "repo"</C>
                  </>,
                  <>
                    product init --name "SplitPay" &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<C># creates .product/ and product/ inside</C>
                  </>,
                ]}
              />
            }
          />
        </Step>

        <Step n={3}>
          <h3>
            <T es="Escribe tu idea, en tus palabras" en="Write down your idea, in your own words" />
          </h3>
          <p>
            <T
              es={
                <>
                  <code>product init</code> te dejó un archivo de plantilla en{' '}
                  <code>product/00-context/idea.md</code>. Lo abres con cualquier editor de texto y escribes lo que
                  ya sabes — sin estructura, sin jerga.
                </>
              }
              en={
                <>
                  <code>product init</code> left you a template file at <code>product/00-context/idea.md</code>. Open
                  it in any text editor and write down what you actually know — no structure, no jargon.
                </>
              }
            />
          </p>
          <div className="example">
            <div className="lbl">
              <T
                es="product/00-context/idea.md · así se ve, ya lleno"
                en="product/00-context/idea.md · what it looks like, filled in"
              />
            </div>
            <T
              es={
                <TerminalBlock
                  lines={[
                    '# SplitPay',
                    <>&nbsp;</>,
                    '## The idea',
                    'Una app para que un grupo en un restaurante divida la cuenta y cada quien pague',
                    'su parte, en vez de que una sola persona la cubra y luego cobre a los demás.',
                    <>&nbsp;</>,
                    '## What you already know',
                    'Nada formal. He visto a grupos de amigos discutir quién le debe a quién al',
                    'salir a comer, varias veces.',
                    <>&nbsp;</>,
                    '## What you are guessing',
                    <span className="hyp">
                      Casi todo — esto se vuelve una hipótesis, no un hecho, y el sistema lo va a marcar así.
                    </span>,
                  ]}
                />
              }
              en={
                <TerminalBlock
                  lines={[
                    '# SplitPay',
                    <>&nbsp;</>,
                    '## The idea',
                    'An app for a group at a restaurant to split the bill and have everyone pay',
                    'their own share, instead of one person covering it and collecting later.',
                    <>&nbsp;</>,
                    '## What you already know',
                    "Nothing formal. I've seen groups of friends argue about who owes who after",
                    'eating out, more than once.',
                    <>&nbsp;</>,
                    '## What you are guessing',
                    <span className="hyp">
                      Almost all of it — this becomes a hypothesis, not a fact, and the system will mark it that way.
                    </span>,
                  ]}
                />
              }
            />
          </div>
        </Step>

        <Step n={4}>
          <h3>
            <T es="Instala los 4 agentes en esta carpeta" en="Install the 4 agents in this folder" />
          </h3>
          <p>
            <T es="Un solo comando, una sola vez por carpeta de producto." en="One command, once per product folder." />
          </p>
          <T
            es={
              <TerminalBlock
                className="cmd"
                lines={[
                  'product agents build --install',
                  <C># escribe .claude/agents/ y .claude/commands/product/ aquí adentro</C>,
                ]}
              />
            }
            en={
              <TerminalBlock
                className="cmd"
                lines={[
                  'product agents build --install',
                  <C># writes .claude/agents/ and .claude/commands/product/ right here</C>,
                ]}
              />
            }
          />
        </Step>

        <Step n={5}>
          <h3>
            <T es="Abre esta carpeta en Claude Code" en="Open this folder in Claude Code" />
          </h3>
          <p>
            <T
              es={
                <>
                  No la carpeta de la herramienta — la de tu idea (<code>splitpay/</code>). A partir de aquí, todo lo
                  que escribes son mensajes normales dentro de Claude Code.
                </>
              }
              en={
                <>
                  Not the tool's folder — your idea's (<code>splitpay/</code>). From here on, everything you type is
                  a normal message inside Claude Code.
                </>
              }
            />
          </p>
          <T
            es={
              <TerminalBlock
                className="cmd"
                lines={[
                  'cd splitpay',
                  <>
                    claude &nbsp;&nbsp;<C># o abre esta carpeta desde la app de Claude Code</C>
                  </>,
                ]}
              />
            }
            en={
              <TerminalBlock
                className="cmd"
                lines={[
                  'cd splitpay',
                  <>
                    claude &nbsp;&nbsp;<C># or open this folder from the Claude Code app</C>
                  </>,
                ]}
              />
            }
          />
        </Step>

        <Step n={6}>
          <h3>
            <code>/product:discover</code> — <T es="el problema, no la solución" en="the problem, not the solution" />
          </h3>
          <p>
            <T
              es={
                <>
                  Lee tu <code>idea.md</code>, te hace un par de preguntas cortas si hace falta, y crea nodos — nunca
                  inventa investigación que no le diste.
                </>
              }
              en={
                <>
                  Reads your <code>idea.md</code>, asks a couple of short questions if it needs to, and creates nodes
                  — it never invents research you didn't give it.
                </>
              }
            />
          </p>
          <div className="example">
            <div className="lbl">
              <T es="lo que ves en pantalla" en="what you see on screen" />
            </div>
            <T
              es={
                <TerminalBlock
                  lines={[
                    <span className="q">¿Qué has observado tú mismo sobre esto? ¿Alguien más además de ti?</span>,
                    <>&nbsp;</>,
                    <>
                      Creado <span className="hyp">NEED-001</span>&nbsp;&nbsp;Groups need independent payment methods
                      &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="hyp">[hypothesis]</span>
                    </>,
                    <>
                      Creado <span className="hyp">ASSUM-001</span> Groups currently abandon at the payment step
                      &nbsp;&nbsp;<span className="hyp">[assumption]</span>
                    </>,
                    <>&nbsp;</>,
                    <span className="dim">Ninguno de los dos tiene evidencia todavía — no me diste ninguna.</span>,
                    <span className="dim">Acéptalos si son correctos, o corrígelos antes de seguir.</span>,
                  ]}
                />
              }
              en={
                <TerminalBlock
                  lines={[
                    <span className="q">What have you actually observed about this yourself? Anyone besides you?</span>,
                    <>&nbsp;</>,
                    <>
                      Created <span className="hyp">NEED-001</span>&nbsp;&nbsp;Groups need independent payment methods
                      &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="hyp">[hypothesis]</span>
                    </>,
                    <>
                      Created <span className="hyp">ASSUM-001</span> Groups currently abandon at the payment step
                      &nbsp;&nbsp;<span className="hyp">[assumption]</span>
                    </>,
                    <>&nbsp;</>,
                    <span className="dim">Neither has evidence yet — you didn't give me any.</span>,
                    <span className="dim">Accept them if they're correct, or fix them before moving on.</span>,
                  ]}
                />
              }
            />
          </div>
        </Step>

        <Step n={7}>
          <h3>
            <code>/product:strategy</code> — <T es="objetivo, meta, métrica" en="objective, goal, metric" />
          </h3>
          <p>
            <T
              es={
                <>
                  Se niega a correr si no aceptaste al menos un <code>NEED</code> antes. No inventa una meta de
                  negocio que tú no le diste.
                </>
              }
              en={
                <>
                  Refuses to run if you haven't accepted at least one <code>NEED</code> first. It won't invent a
                  business goal you didn't give it.
                </>
              }
            />
          </p>
          <div className="example">
            <div className="lbl">
              <T es="lo que ves en pantalla" en="what you see on screen" />
            </div>
            <T
              es={
                <TerminalBlock
                  lines={[
                    'Creado OBJ-001  Increase completed restaurant transactions',
                    'Creado GOAL-001 Reduce payment friction              — serves OBJ-001',
                    'Creado KPI-001  Checkout completion rate             — measures OBJ-001',
                    <span className="dim">&nbsp;&nbsp;definition: completados / iniciados, semanal</span>,
                    <span className="dim">&nbsp;&nbsp;target: 42% → 55%</span>,
                  ]}
                />
              }
              en={
                <TerminalBlock
                  lines={[
                    'Created OBJ-001  Increase completed restaurant transactions',
                    'Created GOAL-001 Reduce payment friction              — serves OBJ-001',
                    'Created KPI-001  Checkout completion rate             — measures OBJ-001',
                    <span className="dim">&nbsp;&nbsp;definition: completed / started, weekly</span>,
                    <span className="dim">&nbsp;&nbsp;target: 42% → 55%</span>,
                  ]}
                />
              }
            />
          </div>
        </Step>

        <Step n={8}>
          <h3>
            <code>/product:stories</code> — <T es="feature + historia de usuario" en="feature + user story" />
          </h3>
          <p>
            <T
              es="Cada historia sale con criterios de aceptación probables, y enlazada a la necesidad y a la meta que la justifican."
              en="Every story comes out with plausible acceptance criteria, linked to the need and the goal that justify it."
            />
          </p>
          <div className="example">
            <div className="lbl">
              <T es="lo que ves en pantalla" en="what you see on screen" />
            </div>
            <T
              es={
                <TerminalBlock
                  lines={[
                    'Creado FEAT-001 Split Bill               — addresses NEED-001, serves GOAL-001',
                    'Creado US-001   Allow customers to split payment  — derives_from FEAT-001',
                    <span className="dim">&nbsp;&nbsp;- Cada participante paga su parte de forma independiente</span>,
                    <span className="dim">&nbsp;&nbsp;- La orden se completa solo cuando todas las partes están pagadas</span>,
                  ]}
                />
              }
              en={
                <TerminalBlock
                  lines={[
                    'Created FEAT-001 Split Bill               — addresses NEED-001, serves GOAL-001',
                    'Created US-001   Allow customers to split payment  — derives_from FEAT-001',
                    <span className="dim">&nbsp;&nbsp;- Each participant pays their own share independently</span>,
                    <span className="dim">&nbsp;&nbsp;- The order only completes once every share is paid</span>,
                  ]}
                />
              }
            />
          </div>
        </Step>

        <Step n={9}>
          <h3>
            <code>/product:plan</code> — <T es="ya del lado técnico" en="now on the technical side" />
          </h3>
          <p>
            <T
              es="Esta parte normalmente la corre un ingeniero, o tú si construyes con un agente de código. Convierte la historia en tareas concretas."
              en="This part is usually run by an engineer, or by you if you're building with a coding agent. It turns the story into concrete tasks."
            />
          </p>
          <div className="example">
            <div className="lbl">
              <T es="lo que ves en pantalla" en="what you see on screen" />
            </div>
            <T
              es={<TerminalBlock lines={['Creado TASK-001 Implement per-participant payment intents  — derives_from US-001']} />}
              en={<TerminalBlock lines={['Created TASK-001 Implement per-participant payment intents  — derives_from US-001']} />}
            />
          </div>
        </Step>

        <Step n={10}>
          <h3>
            <T es="Revisas, aceptas, y preguntas por qué" en="You review, you accept, and you ask why" />
          </h3>
          <p>
            <T
              es="Nada cuenta como real hasta que corres esto tú — ningún agente puede hacerlo por ti. Y esto es exactamente lo que viste al principio de esta página."
              en="Nothing counts as real until you run this yourself — no agent can do it for you. And this is exactly what you saw at the top of this page."
            />
          </p>
          <T
            es={
              <TerminalBlock
                className="cmd"
                lines={[
                  'product node accept NEED-001 OBJ-001 GOAL-001 FEAT-001 US-001',
                  <>
                    product why TASK-001 &nbsp;&nbsp;<C># el panel del inicio de esta página, generado así</C>
                  </>,
                ]}
              />
            }
            en={
              <TerminalBlock
                className="cmd"
                lines={[
                  'product node accept NEED-001 OBJ-001 GOAL-001 FEAT-001 US-001',
                  <>
                    product why TASK-001 &nbsp;&nbsp;<C># the panel at the top of this page, made this way</C>
                  </>,
                ]}
              />
            }
          />
        </Step>
      </div>
    </section>
  );
}
