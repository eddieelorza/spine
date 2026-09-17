import { T } from '../lang';

export function Footer() {
  return (
    <footer>
      <p>
        <T
          es={
            <>
              MIT &middot; <code>packages/core</code> nunca llama a un modelo ni toca la red — verificado con un test
              de arquitectura, no con una promesa. La documentación completa de las cuatro fases de diseño vive en{' '}
              <code>docs/</code> dentro del repo.
            </>
          }
          en={
            <>
              MIT &middot; <code>packages/core</code> never calls a model or touches the network — verified with an
              architecture test, not a promise. The full documentation for the four design phases lives in{' '}
              <code>docs/</code> inside the repo.
            </>
          }
        />
      </p>
      <p className="fine">
        <T
          es="Esta página se genera desde una app de React — el contenido refleja el estado real del repo, no una foto fija escrita a mano."
          en="This page is generated from a React app — its content reflects the repo's real state, not a hand-written snapshot."
        />
      </p>
    </footer>
  );
}
