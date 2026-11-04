import { describe, expect, it } from 'vitest';
import { lerUsuarios } from '../scripts/seed-users.js';

const usuario = (n: number) => ({
  [`SEED_USER_${n}_EMAIL`]: `u${n}@casa.test`,
  [`SEED_USER_${n}_NOME`]: `Usuário ${n}`,
  [`SEED_USER_${n}_SENHA`]: `senha-forte-${n}`,
});

describe('lerUsuarios', () => {
  it('lê os usuários em sequência (1, 2, 3, ...)', () => {
    const env = { ...usuario(1), ...usuario(2), ...usuario(3), ...usuario(4) };
    expect(lerUsuarios(env).map((u) => u.email)).toEqual([
      'u1@casa.test',
      'u2@casa.test',
      'u3@casa.test',
      'u4@casa.test',
    ]);
  });

  it('para no primeiro número que falta (não pula buracos)', () => {
    const env = { ...usuario(1), ...usuario(2), ...usuario(4) };
    expect(lerUsuarios(env)).toHaveLength(2);
  });

  it('devolve nome e senha junto com o e-mail', () => {
    expect(lerUsuarios(usuario(1))).toEqual([
      { email: 'u1@casa.test', nome: 'Usuário 1', senha: 'senha-forte-1' },
    ]);
  });

  it('falha se um usuário tem e-mail mas falta nome ou senha', () => {
    const env = { ...usuario(1), SEED_USER_2_EMAIL: 'u2@casa.test', SEED_USER_2_NOME: 'Dois' };
    expect(() => lerUsuarios(env)).toThrow('SEED_USER_2_SENHA');
  });

  it('falha se não há nenhum usuário', () => {
    expect(() => lerUsuarios({})).toThrow('SEED_USER_1_EMAIL');
  });
});
