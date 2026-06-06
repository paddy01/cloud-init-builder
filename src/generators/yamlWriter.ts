import { stringify } from "yaml";

export function writeYaml(value: unknown): string {
  return stringify(value, {
    directives: false,
    lineWidth: 0,
  });
}
