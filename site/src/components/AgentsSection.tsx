import { useState } from 'react';
import { T } from '../lang';
import { Typewriter } from './Typewriter';
import { useReveal } from '../hooks/useReveal';

interface AgentRow {
  id: string;
  nameEs: string;
  nameEn: string;
  descEs: React.ReactNode;
  descEn: React.ReactNode;
  enforced: number;
  promptOnly: number;
}

const AGENTS: AgentRow[] = [
  {
    id: 'product-discovery',
    nameEs: 'product-discovery',
    nameEn: 'product-discovery',
    descEs: (
      <>
        Convierte tu <code>idea.md</code> en <code>NEED</code> y <code>ASSUM</code> — nunca inventa evidencia que no
        le diste.
      </>
    ),
    descEn: (
      <>
        Turns your <code>idea.md</code> into <code>NEED</code> and <code>ASSUM</code> nodes — never invents evidence
        you didn't give it.
      </>
    ),
    enforced: 3,
    promptOnly: 2,
  },
  {
    id: 'product-manager',
    nameEs: 'product-manager',
    nameEn: 'product-manager',
    descEs: (
      <>
        Escribe <code>OBJ</code>, <code>GOAL</code>, <code>KPI</code>, <code>FEAT</code> y <code>US</code> — se niega
        a correr sin al menos un <code>NEED</code> aceptado.
      </>
    ),
    descEn: (
      <>
        Writes <code>OBJ</code>, <code>GOAL</code>, <code>KPI</code>, <code>FEAT</code> and <code>US</code> — refuses
        to run without at least one accepted <code>NEED</code>.
      </>
    ),
    enforced: 4,
    promptOnly: 3,
  },
  {
    id: 'system-analyst',
    nameEs: 'system-analyst',
    nameEn: 'system-analyst',
    descEs: (
      <>
        Convierte historias aceptadas en <code>TASK</code> técnicos, y deja <code>DEC</code> y <code>RISK</code> por
        escrito en vez de en la cabeza de alguien.
      </>
    ),
    descEn: (
      <>
        Turns accepted stories into technical <code>TASK</code>s, and puts <code>DEC</code> and <code>RISK</code> on
        record instead of in someone's head.
      </>
    ),
    enforced: 3,
    promptOnly: 3,
  },
  {
    id: 'product-critic',
    nameEs: 'product-critic',
    nameEn: 'product-critic',
    descEs: (
      <>
        No crea nada. Cuestiona lo que los otros tres produjeron — razonamiento débil, supuestos disfrazados de
        hechos, trazabilidad vacía.
      </>
    ),
    descEn: (
      <>
        Creates nothing. Challenges what the other three produced — weak reasoning, assumptions dressed as facts,
        empty traceability.
      </>
    ),
    enforced: 2,
    promptOnly: 4,
  },
];

function ProofPanel() {
  const { ref, revealed } = useReveal<HTMLPreElement>();
  const [line1Done, setLine1Done] = useState(false);

  const cmd = 'product node new FEAT --title "Split Bill" --agent product-discovery';

  return (
    <pre className={`proof${revealed ? ' revealed' : ''}`} ref={ref}>
      <span className="tline" style={{ transitionDelay: '0ms' }}>
        <span className="prompt">$ </span>
        {revealed && !line1Done ? (
          <Typewriter text={cmd} start={revealed} onDone={() => setLine1Done(true)} />
        ) : (
          cmd
        )}
      </span>
      <span className="tline" style={{ transitionDelay: '30ms' }}>
        <span className="err">Agent 'product-discovery' may not create a FEAT node.</span>
      </span>
      <span className="tline" style={{ transitionDelay: '60ms' }}>
        <>&nbsp;</>
      </span>
      <span className="tline" style={{ transitionDelay: '90ms' }}>
        <span className="prompt">$ </span>echo $?
      </span>
      <span className="tline" style={{ transitionDelay: '120ms' }}>
        4
      </span>
    </pre>
  );
}

export function AgentsSection() {
  return (
    <section id="agentes">
      <h2>
        <T es="Cuatro agentes, cada uno con permisos reales" en="Four agents, each with real permissions" />
      </h2>
      <p className="section-lede">
        <T
          es={
            <>
              No son cuatro prompts distintos disfrazados de personalidad. Cada agente tiene una lista concreta de
              qué tipo de nodo puede crear y cuál no — enforced por código, no solo sugerido en el prompt.
            </>
          }
          en={
            <>
              These aren't four different prompts wearing different personalities. Each agent has a concrete list of
              which node types it can and can't create — enforced in code, not just suggested in the prompt.
            </>
          }
        />
      </p>

      <div className="agents">
        {AGENTS.map((a) => (
          <div className="agent-row" key={a.id}>
            <div className="agent-name">{a.nameEs === a.nameEn ? a.nameEs : <T es={a.nameEs} en={a.nameEn} />}</div>
            <p className="agent-desc">
              <T es={a.descEs} en={a.descEn} />
            </p>
            <div className="agent-rules">
              <span className="rule-count enforced">
                {a.enforced} <T es="reglas forzadas" en="enforced rules" />
              </span>
              <span className="rule-count prompt-only">
                {a.promptOnly} <T es="solo de prompt" en="prompt-only" />
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="example">
        <div className="lbl">
          <T
            es="lo que pasa si un agente intenta salirse de su carril"
            en="what happens when an agent tries to step outside its lane"
          />
        </div>
        <ProofPanel />
      </div>
    </section>
  );
}
