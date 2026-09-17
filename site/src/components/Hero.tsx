import { useState } from 'react';
import { T, useLang } from '../lang';
import { Typewriter } from './Typewriter';

const CAPTION = {
  es: 'product why TASK-001 · salida real, sin editar',
  en: 'product why TASK-001 · real output, unedited',
};

const TREE_LINES: React.ReactNode[] = [
  <>
    <span className="prompt">TASK-001</span>&nbsp;&nbsp;Implement per-participant payment intents&nbsp;&nbsp;[accepted]
  </>,
  <>
    └─ derives_from <span className="id">US-001</span>&nbsp;&nbsp;Allow customers to split payment&nbsp;&nbsp;[accepted]
  </>,
  <>
    &nbsp;&nbsp;&nbsp;└─ derives_from <span className="id">FEAT-001</span>&nbsp;&nbsp;Split Bill&nbsp;&nbsp;[accepted]
  </>,
  <>
    &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;├─ addresses <span className="id">NEED-001</span>&nbsp;&nbsp;Groups need independent payment
    methods&nbsp;&nbsp;<span className="hyp">[hypothesis]</span>
  </>,
  <>
    &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└─ serves <span className="id">GOAL-001</span>&nbsp;&nbsp;Reduce payment friction&nbsp;&nbsp;[accepted]
  </>,
  <>
    &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└─ serves <span className="id">OBJ-001</span>&nbsp;&nbsp;Increase completed restaurant
    transactions&nbsp;&nbsp;[accepted]
  </>,
  <>&nbsp;</>,
  <>
    &nbsp;&nbsp;&nbsp;measured by <span className="id">KPI-001</span>&nbsp;&nbsp;Checkout completion rate
  </>,
  <>&nbsp;</>,
  <>
    <span className="warn">!</span>&nbsp;&nbsp;This chain rests on 1 unvalidated node:
  </>,
  <>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;NEED-001&nbsp;&nbsp;hypothesis, no evidence recorded</>,
  <>&nbsp;&nbsp;&nbsp;Run&nbsp;&nbsp;product node show NEED-001&nbsp;&nbsp;to see it.</>,
];

export function Hero() {
  const { lang } = useLang();
  const [captionDone, setCaptionDone] = useState(false);
  const [startCaption, setStartCaption] = useState(false);

  return (
    <div className="hero">
      <h1 className="hero-anim">
        <T
          es={
            <>
              De la idea a producción, <em>sin perder el porqué</em>
            </>
          }
          en={
            <>
              From idea to production, <em>without losing the why</em>
            </>
          }
        />
      </h1>
      <p className="lede hero-anim">
        <T
          es={
            <>
              <b>Spine</b> no genera PRDs. Convierte cada objetivo, necesidad, feature, historia y tarea en
              un nodo con ID, enlazado a los nodos de los que depende — para que{' '}
              <code style={{ fontSize: 13 }}>product why US-014</code> te diga en un segundo por qué existe algo, y
              si esa razón todavía descansa en un supuesto sin validar.
            </>
          }
          en={
            <>
              <b>Spine</b> doesn't generate PRDs. It turns every objective, need, feature, story and task
              into a node with an ID, linked to whatever justifies it existing — so{' '}
              <code style={{ fontSize: 13 }}>product why US-014</code> tells you in one second why something
              exists, and whether that reason still rests on an unvalidated assumption.
            </>
          }
        />
      </p>
      <div className="cta-row hero-anim">
        <a className="btn primary" href="#instalar">
          <T es="Instalar →" en="Install →" />
        </a>
        <a className="btn" href="#agentes">
          <T es="Ver los 4 agentes" en="See the 4 agents" />
        </a>
      </div>

      <div
        className="term hero-anim"
        ref={(el) => {
          // The hero's load-in stagger reaches this panel's slot at 210ms
          // (see .hero-anim:nth-child(4) in index.css) — start typing then,
          // once, on mount.
          if (el && !startCaption) {
            window.setTimeout(() => setStartCaption(true), 260);
          }
        }}
      >
        <div className="bar">
          <span className="dot" />
          {/* The typewriter only ever plays this one intro, using whatever
              language was active when it started. Once it finishes, a
              plain reactive <T> takes over — so toggling language later
              swaps the caption's text instantly, the same as everywhere
              else on the page, instead of re-triggering the animation. */}
          {captionDone ? (
            <span className="caption">
              <T es={CAPTION.es} en={CAPTION.en} />
            </span>
          ) : (
            <Typewriter text={CAPTION[lang]} start={startCaption} onDone={() => setCaptionDone(true)} className="caption" />
          )}
        </div>
        <pre className={captionDone ? 'revealed' : ''}>
          {TREE_LINES.map((line, i) => (
            <span key={i} className="tline" style={{ transitionDelay: `${Math.min(i, 12) * 30}ms` }}>
              {line}
            </span>
          ))}
        </pre>
      </div>

      <div className="pullquote hero-anim">
        <p className="pq-mark">!</p>
        <div>
          <p className="pq-text">
            <T es="Esta cadena descansa sobre un nodo sin validar." en="This chain rests on an unvalidated node." />
          </p>
          <p className="pq-detail">
            <T
              es={
                <>
                  <code>NEED-001</code> · hypothesis, sin evidencia registrada
                </>
              }
              en={
                <>
                  <code>NEED-001</code> · hypothesis, no evidence recorded
                </>
              }
            />
          </p>
        </div>
      </div>
    </div>
  );
}
