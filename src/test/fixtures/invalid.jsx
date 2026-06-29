export function Broken() {
  return (
    <div>
      <img src="foto.jpg" />
      <span onClick={() => {}}>Clique</span>
      <input autoFocus />
      <input type="text" placeholder="Nome" />
      <button></button>
      <button>🔍</button>
      <a href="/sobre">clique aqui</a>
      <a>Sem href</a>
      <div tabIndex={5}>Focável</div>
      <iframe src="https://example.com"></iframe>
      <table>
        <tr>
          <th>Nome</th>
        </tr>
      </table>
      <video controls>
        <source src="v.mp4" />
      </video>
      <h1>Título</h1>
      <h3>Pulou h2</h3>
    </div>
  );
}
