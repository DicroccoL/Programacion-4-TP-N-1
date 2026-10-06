// Un solo worker evita saturar el inicio de procesos en este entorno Windows.
// Angular sigue preparando jsdom, TestBed y las plantillas a través de ng test.
export default {
  test: { pool: 'threads', maxWorkers: 1, fileParallelism: false },
};
