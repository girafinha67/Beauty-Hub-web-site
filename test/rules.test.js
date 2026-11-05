'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const R = require('../lib/rules');
const { CPF, CNPJ } = require('./helpers');

test('CPF e CNPJ: dígitos verificadores', () => {
  CPF.forEach(c => assert.ok(R.cpfOk(c)));
  assert.ok(R.cpfOk('529.982.247-25')); assert.ok(R.cnpjOk('11.222.333/0001-81')); assert.ok(R.cnpjOk(CNPJ));
  ['52998224724', '11111111111', '123', '', null].forEach(c => assert.ok(!R.cpfOk(c)));
  ['11222333000182', '00000000000000', '123'].forEach(c => assert.ok(!R.cnpjOk(c)));
});
test('nome completo', () => {
  ['Maria Silva', 'José da Silva', 'Ana Beatriz de Oliveira Santos', "João D'Ávila", 'Maria-Clara Souza', 'Ferreira Silva'].forEach(n => assert.equal(R.nomeErro(n), '', n));
  ['Maria', 'M S', 'Maria 2', 'aaa bbb', 'teste teste', 'Maria Maria', 'Ana @Silva', 'asdf qwer', 'Maria  ', '', 'Jo x'].forEach(n => assert.notEqual(R.nomeErro(n), '', n));
});
test('e-mail', () => {
  ['maria.silva@gmail.com', 'mariana+lash@gmail.com', 'ana@empresa.com.br', 'a.b@outlook.com'].forEach(e => assert.equal(R.emailErro(e), '', e));
  ['', 'maria', 'maria@', '@gmail.com', 'maria@gmail', 'ma ria@gmail.com', 'maria..silva@gmail.com', '.maria@x.com', 'maria@-x.com', 'maria@x.c'].forEach(e => assert.notEqual(R.emailErro(e), '', e));
  assert.match(R.emailErro('maria@gmial.com'), /gmail\.com/);
  assert.notEqual(R.emailErro('maria@mailinator.com'), '');
  assert.notEqual(R.emailErro('abc@gmail.com'), '');      // Gmail: mínimo 6
  assert.notEqual(R.emailErro('abc_def@gmail.com'), '');  // Gmail não aceita sublinhado
  assert.equal(R.emailErro('abc@gmial.com', { login: true }), ''); // login só confere a sintaxe
  assert.ok(R.emailOk('x@y.co'));
});
