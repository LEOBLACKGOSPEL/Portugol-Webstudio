import { portugolLibs } from "../libs";

export const portugolRuntime = /* javascript */ `
class PortugolRuntime {
  globalScope = {};

  constructor(initScope) {
    this.initScope = initScope;

    this.globalScope = {
      ...this.getScope(initScope),
      libAliases: {},
    };

    this.libs = ${portugolLibs};
  }

  getScope(baseScope) {
    return {
      variables: { ...baseScope.variables },
      functions: { ...baseScope.functions },
    };
  }

  _raw(variable) {
    if (typeof variable === "object") {
      if (variable.hasOwnProperty("_value")) {
        return variable._;
      }
    }

    return variable;
  }

  declareFunction(name, call) {
    if (this.globalScope.functions.hasOwnProperty(name)) {
      throw new Error("Função já declarada: " + name);
    }

    this.globalScope.functions[name] = call;
  }

  callFunction(name, functionScope = "", args = []) {
    let func;

    if (functionScope) {
      if (!this.globalScope.libAliases.hasOwnProperty(functionScope)) {
        throw new Error("Biblioteca não carregada: " + functionScope);
      }

      if (!this.libs[this.globalScope.libAliases[functionScope]].hasOwnProperty(name)) {
        throw new Error("Função '" + name + "' não existe na biblioteca '" + functionScope + "'");
      }

      func = this.libs[this.globalScope.libAliases[functionScope]][name];
    } else {
      if (!this.globalScope.functions.hasOwnProperty(name)) {
        throw new Error("Função não declarada: " + name);
      }

      func = this.globalScope.functions[name];
    }

    return func(...args);
  }

  assign(args) {
    let initial = args.shift();

    while (args.length) {
      const arg = args.pop();
      console.log("assign", { initial, arg });

      if (initial.type === "vazio") {
        throw new Error("Não é possível atribuir valor ao tipo vazio");
      }

      if (initial.isConstant) {
        throw new Error("Não é possível alterar o valor de uma constante");
      }

      const value = this.coerceToType(initial.type, arg.value);

      if (initial.isReference) {
        initial.value.value = value;
      } else {
        initial.value = value;
      }

      initial = arg;
    }

    console.log("assign.final", { initial });

    return initial;
  }

  loadLibrary(name, alias) {
    if (!this.libs.hasOwnProperty(name)) {
      throw new Error("Biblioteca não existe: " + name);
    }

    this.libs[name].__loadedAt = Date.now();
    this.globalScope.libAliases[alias || name] = name;
  }

  coerceToType(type, value) {
    switch (type) {
      case "inteiro": {
        const result = parseInt(value, 10);

        if (isNaN(result)) {
          throw new Error("Tipos incompatíveis! Não é possível atribuir o valor '" + value + "' à uma expressão do tipo '" + type + "'.");
        }

        return result;
      }

      case "real": {
        const result = parseFloat(value);

        if (isNaN(result)) {
          throw new Error("Tipos incompatíveis! Não é possível atribuir o valor '" + value + "' à uma expressão do tipo '" + type + "'.");
        }

        return result;
      }

      case "caractere":
        return String(value).charAt(0);

      case "cadeia":
        return String(value);

      case "logico":
        return Boolean(value);

      default:
        return value;
    }
  }

  mathOperation(op, args) {
    console.log("mathOp.preinit", { op, args });

    let result = args.shift().clone();

    console.log("mathOperation.init", { op, args, result });

    while (args.length) {
      let arg = args.shift().clone();
      console.log("mathOperation.ongoing", { arg, result });

      if (!["real", "inteiro"].includes(arg.type) || ([">>", "<<"].includes(op) && (arg.type !== "inteiro" || result.type !== "inteiro"))) {
        const mathOpDesc = {
          "+": ["somar", "à"],
          "-": ["subtrair", "de"],
          "*": ["multiplicar", "por"],
          "/": ["dividir", "por"],
          "%": ["obter o módulo entre", "e"],
          ">>": ["deslocar os bits para a direita de", "para"],
          "<<": ["deslocar os bits para a esquerda de", "para"],
        };

        const [verb, preposition] = mathOpDesc[op];

        throw new Error("Tipos incompatíveis! Não é possível " + verb + " uma expressão do tipo '" + result.type + "' (" + result.toString() + ") " + preposition + " uma expressão do tipo '" + arg.type + "' (" + arg.toString() + ").");
      }

      switch (op) {
        case "+":
          result.value += arg.value;
          break;

        case "-":
          result.value -= arg.value;
          break;

        case "*":
          result.value *= arg.value;
          break;

        case "/":
          result.value /= arg.value;
          break;

        case "%":
          result.value %= arg.value;
          break;

        case ">>":
          result.value = result.value >> arg.value;
          break;

        case "<<":
          result.value = result.value << arg.value;
          break;

        default:
          throw new Error("Operação matemática inválida: " + op);
      }
    }

    console.log("mathOperation.finish", { result });
    return result;
  }

  comparativeOperation(op, args) {
    console.log("comparativeOp.preinit", { op, args });
    let result = args.shift().value;

    while (args.length) {
      console.log("comparativeOp.ongoing", { op, args, result });
      let arg = args.shift().value;

      switch (op) {
        case "==":
          result = result == arg;
          break;

        case "!=":
          result = result != arg;
          break;

        case ">":
          result = result > arg;
          break;

        case ">=":
          result = result >= arg;
          break;

        case "<":
          result = result < arg;
          break;

        case "<=":
          result = result <= arg;
          break;

        case "&&":
          result = result && arg;
          break;

        case "||":
          result = result || arg;
          break;

        case "|":
          result = result | arg;
          break;

        case "&":
          result = result & arg;
          break;

        case "^":
          result = result ^ arg;
          break;

        default:
          throw new Error("Operação comparativa inválida: " + op);
      }
    }

    console.log("comparativeOp.finish", { result });
    return new PortugolVar("logico", result);
  }

  applyModifier(mod, item) {
    console.log("applyModifier.init", { mod, item });

    switch (mod) {
      case "+":
        item.value = +item.value;
        break;

      case "-":
        item.value = -item.value;
        break;

      case "!":
        item.value = !item.value;
        break;

      case "~":
        item.value = ~item.value;
        break;

      default:
        throw new Error("Modificador inválido: " + mod);
    }

    console.log("applyModifier.finish", { item });
    return item;
  }

  assumeMathType(...args) {
    let type = "inteiro";

    for (let arg of args) {
      if (arg.type == "real") {
        type = "real";
        break;
      }
    }

    return type;
  }

  expectType(fn, param, obj, ...types) {
    if (!types.includes(obj.type) || obj.value === undefined) {
      let multipleTypesPlural = types.length > 1 ? "s" : "";
      throw new Error("Tipos incompatíveis! O parâmetro '" + param + "' da função '" + fn + "' espera uma expressão do" + multipleTypesPlural + " tipo" + multipleTypesPlural + " " + types.map((c) => "'" + c + "'").join(" ou ") + (obj.value === undefined ? " com valor" : "") + ", mas foi passada uma expressão do tipo '" + obj.type + "'" + (obj.value === undefined ? " vazia" : ""));
    }
  }
}
//endregion
`;
