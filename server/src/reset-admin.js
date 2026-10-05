// Recupera o acesso ao admin quando a senha foi perdida.
// Uso (na pasta server/):
//   npm run reset-admin -- NovaSenha
//   npm run reset-admin -- NovaSenha novoUsuario
import "dotenv/config";
import { initDb, resetAdmin } from "./db.js";

const [password, username] = process.argv.slice(2);

if (!password || password.length < 8){
  console.error("Informe a nova senha (mínimo 8 caracteres):  npm run reset-admin -- NovaSenha [usuario]");
  process.exit(1);
}

await initDb();
const user = await resetAdmin(password, username);
console.log(`Pronto! Agora entre com usuário "${user}" e a nova senha. Todas as sessões abertas foram encerradas.`);
process.exit(0);
