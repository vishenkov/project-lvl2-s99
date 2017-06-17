import _ from 'lodash';
import Node from './Node';

const buildAst = (data1, data2) => {
  const getChild = (value, name, type) => {
    if (value instanceof Object) {
      const node = buildAst(value, value);
      return new Node(name, type, null, node.children);
    }
    return new Node(name, type, value, []);
  };

  const keys = _.union(Object.keys(data1), Object.keys(data2));
  return keys.reduce((acc, key) => {
    if ((key in data1) && (key in data2)) {
      if (data1[key] === data2[key]) {
        const child = getChild(data1[key], key, 'original');
        return new Node(acc.name, acc.type, acc.value, [...acc.children, child]);
      }

      if ((data1[key] instanceof Object) && (data2[key] instanceof Object)) {
        const node = buildAst(data1[key], data2[key]);
        const child = new Node(key, node.type, null, node.children);
        return new Node(acc.name, acc.type, acc.value, [...acc.children, child]);
      }
      const child1 = getChild(data1[key], key, 'deleted');
      const child2 = getChild(data2[key], key, 'new');
      return new Node(acc.name, acc.type, acc.value, [...acc.children, child2, child1]);
    }

    if ((key in data1)) {
      const child = getChild(data1[key], key, 'deleted');
      return new Node(acc.name, acc.type, acc.value, [...acc.children, child]);
    }
    const child = getChild(data2[key], key, 'new');
    return new Node(acc.name, acc.type, acc.value, [...acc.children, child]);
  }, new Node('', 'original', null, []));
};

const genDiff = (data1, data2) => {
  const genObject = (data) => {
    return Object.keys(data)
    .map((key) => {
      if (data[key] instanceof Object) {
        return { type: 'original', key, children: genObject(data[key]) };
      }
      return { type: 'original', key, value: data[key] };
    });
  };

  const keys = _.union(Object.keys(data1), Object.keys(data2));
  return keys.map((key) => {
    if ((data1[key] instanceof Object) && (data2[key] instanceof Object)) {
      return { type: 'nested', key, children: genDiff(data1[key], data2[key]) };
    }
    if (data1[key] === data2[key]) {
      return { type: 'original', key, value: data1[key] };
    }
    if ((key in data1) && (key in data2)) {
      const oldValue = data1[key] instanceof Object ? genObject(data1[key]) : data1[key];
      const newValue = data2[key] instanceof Object ? genObject(data2[key]) : data2[key];
      return { type: 'changed', key, old: oldValue, new: newValue };
    }
    if (key in data2) {
      if (data2[key] instanceof Object) {
        return { type: 'new', key, children: genObject(data2[key]) };
      }
      return { type: 'new', key, value: data2[key] };
    }
    if (data1[key] instanceof Object) {
      return { type: 'deleted', key, children: genObject(data1[key]) };
    }
    return { type: 'deleted', key, value: data1[key] };
  });
};

export default (data1, data2) => {
  const ast = genDiff(data1, data2);
  // console.log(JSON.stringify(ast, null, '  '));
  return ast;
};
