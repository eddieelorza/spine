import { T } from '../lang';

export function GraphSection() {
  return (
    <section>
      <h2>
        <T es="Un grafo, no un generador de documentos" en="A graph, not a document generator" />
      </h2>
      <p className="section-lede">
        <T
          es={
            <>
              Cada afirmación de producto es un archivo Markdown con YAML: un ID permanente (<code>OBJ-001</code>,{' '}
              <code>NEED-003</code>, <code>US-014</code>), un tipo de afirmación (<code>fact</code> /{' '}
              <code>hypothesis</code> / <code>assumption</code> / <code>decision</code>), y enlaces tipados hacia lo
              que justifica que exista. La espina canónica — la que <code>product why</code> recorre — es siempre la
              misma:
            </>
          }
          en={
            <>
              Every product claim is a Markdown file with YAML: a permanent ID (<code>OBJ-001</code>,{' '}
              <code>NEED-003</code>, <code>US-014</code>), a claim type (<code>fact</code> / <code>hypothesis</code> /{' '}
              <code>assumption</code> / <code>decision</code>), and typed links to whatever justifies it existing.
              The canonical spine — the one <code>product why</code> walks — is always the same:
            </>
          }
        />
      </p>

      <div className="diagram-frame">
        <figure className="spine">
          <svg
            viewBox="0 0 440 460"
            role="img"
            aria-label="TASK derives from US, which derives from FEAT. FEAT serves GOAL and addresses NEED. GOAL serves OBJ. OBJ is measured by KPI."
          >
            <defs>
              <marker id="ar" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse">
                <path d="M0,0 L10,5 L0,10 z" fill="currentColor" />
              </marker>
            </defs>

            <text x="120" y="45" textAnchor="middle" className="sp-node" fill="#F3EEE2">OBJ</text>
            <text x="120" y="61" textAnchor="middle" className="sp-gloss" fill="#9C9384">
              <T es="objetivo" en="objective" />
            </text>
            <line x1="178" y1="40" x2="330" y2="40" stroke="currentColor" strokeWidth="1" markerEnd="url(#ar)" />
            <text x="254" y="30" textAnchor="middle" className="sp-edge" fill="#9C9384">measured_by</text>
            <text x="385" y="45" textAnchor="middle" className="sp-node" fill="#F3EEE2">KPI</text>
            <text x="385" y="61" textAnchor="middle" className="sp-gloss" fill="#9C9384">
              <T es="métrica" en="metric" />
            </text>

            <line x1="120" y1="118" x2="120" y2="70" stroke="currentColor" strokeWidth="1" markerEnd="url(#ar)" />
            <text x="142" y="98" className="sp-edge" fill="#9C9384">serves</text>
            <text x="120" y="140" textAnchor="middle" className="sp-node" fill="#F3EEE2">GOAL</text>
            <text x="120" y="156" textAnchor="middle" className="sp-gloss" fill="#9C9384">
              <T es="meta" en="goal" />
            </text>

            <line x1="120" y1="198" x2="120" y2="150" stroke="currentColor" strokeWidth="1" markerEnd="url(#ar)" />
            <text x="142" y="178" className="sp-edge" fill="#9C9384">serves</text>
            <text x="120" y="220" textAnchor="middle" className="sp-node" fill="#E8A33D">FEAT</text>
            <text x="120" y="236" textAnchor="middle" className="sp-gloss" fill="#9C9384">feature</text>

            <line x1="178" y1="215" x2="330" y2="215" stroke="currentColor" strokeWidth="1" markerEnd="url(#ar)" />
            <text x="254" y="205" textAnchor="middle" className="sp-edge" fill="#9C9384">addresses</text>
            <text x="385" y="220" textAnchor="middle" className="sp-node" fill="#F3EEE2">NEED</text>
            <text x="385" y="236" textAnchor="middle" className="sp-gloss" fill="#9C9384">
              <T es="necesidad" en="need" />
            </text>

            <line x1="120" y1="298" x2="120" y2="250" stroke="currentColor" strokeWidth="1" markerEnd="url(#ar)" />
            <text x="142" y="278" className="sp-edge" fill="#9C9384">derives_from</text>
            <text x="120" y="320" textAnchor="middle" className="sp-node" fill="#F3EEE2">US</text>
            <text x="120" y="336" textAnchor="middle" className="sp-gloss" fill="#9C9384">
              <T es="historia" en="story" />
            </text>

            <line x1="120" y1="398" x2="120" y2="350" stroke="currentColor" strokeWidth="1" markerEnd="url(#ar)" />
            <text x="142" y="378" className="sp-edge" fill="#9C9384">derives_from</text>
            <text x="120" y="420" textAnchor="middle" className="sp-node" fill="#F3EEE2">TASK</text>
            <text x="120" y="436" textAnchor="middle" className="sp-gloss" fill="#9C9384">
              <T es="tarea técnica" en="technical task" />
            </text>
          </svg>
          <figcaption>
            <T
              es={
                <>
                  La espina que recorre <code style={{ fontSize: 11 }}>product why</code>, de abajo hacia arriba —
                  igual que el árbol del ejemplo de más arriba. Cualquier nodo puede además colgar de un{' '}
                  <code style={{ fontSize: 11 }}>ASSUM</code>, <code style={{ fontSize: 11 }}>QUES</code>,{' '}
                  <code style={{ fontSize: 11 }}>DEC</code> o <code style={{ fontSize: 11 }}>RISK</code> — y eso es lo
                  que aparece en el pie de honestidad.
                </>
              }
              en={
                <>
                  The spine <code style={{ fontSize: 11 }}>product why</code> walks, bottom to top — same tree as
                  the example above. Any node can also hang off an <code style={{ fontSize: 11 }}>ASSUM</code>,{' '}
                  <code style={{ fontSize: 11 }}>QUES</code>, <code style={{ fontSize: 11 }}>DEC</code> or{' '}
                  <code style={{ fontSize: 11 }}>RISK</code> — and that's what shows up in the honesty footer.
                </>
              }
            />
          </figcaption>
        </figure>
      </div>
    </section>
  );
}
