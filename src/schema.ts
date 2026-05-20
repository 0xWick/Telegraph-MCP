import { z } from "zod";

export function jsonSchemaToZod(schema: Record<string, unknown> | undefined): z.ZodTypeAny {
  if (!schema) return z.object({});
  return parseSchema(schema, new Set());
}

function parseSchema(schema: Record<string, unknown>, visited: Set<unknown>): z.ZodTypeAny {
  if (schema.$ref) {
    return z.any().describe(`$ref: ${schema.$ref as string}`);
  }
  if (schema.oneOf || schema.anyOf || schema.allOf) {
    return z.any();
  }

  const type = schema.type as string | undefined;

  if (!type) {
    if (schema.properties) return parseObjectType(schema as any, visited);
    return z.any();
  }

  switch (type) {
    case "string": {
      if (schema.enum && Array.isArray(schema.enum) && schema.enum.length > 0) {
        return z.enum(schema.enum as [string, ...string[]]).describe(
          (schema.description as string) || "enum value"
        );
      }
      let s = z.string();
      if (schema.description) s = s.describe(schema.description as string);
      return s;
    }

    case "number":
    case "integer": {
      let n: z.ZodNumber = z.number();
      if (type === "integer") n = n.int();
      if (schema.minimum !== undefined) n = n.min(schema.minimum as number);
      if (schema.maximum !== undefined) n = n.max(schema.maximum as number);
      if (schema.description) n = n.describe(schema.description as string);
      return n;
    }

    case "boolean": {
      let b = z.boolean();
      if (schema.description) b = b.describe(schema.description as string);
      return b;
    }

    case "array": {
      const items = schema.items as Record<string, unknown> | undefined;
      const itemSchema = items ? parseSchema(items, visited) : z.any();
      let arr = z.array(itemSchema);
      if (schema.description) arr = arr.describe(schema.description as string) as z.ZodArray<any>;
      return arr;
    }

    case "object": {
      return parseObjectType(schema as any, visited);
    }

    default:
      return z.any();
  }
}

function parseObjectType(
  schema: { properties?: Record<string, Record<string, unknown>>; required?: string[]; description?: string },
  visited: Set<unknown>
): z.ZodTypeAny {
  const properties = schema.properties;
  const required = new Set(schema.required || []);

  if (!properties) {
    return z.record(z.any());
  }

  const shape: Record<string, z.ZodTypeAny> = {};
  for (const [key, propSchema] of Object.entries(properties)) {
    let field = parseSchema(propSchema, visited);
    if (!required.has(key)) {
      field = field.optional();
    }
    shape[key] = field;
  }

  let obj: z.ZodTypeAny = z.object(shape);
  if (schema.description) {
    obj = obj.describe(schema.description);
  }
  return obj;
}
