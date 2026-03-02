import { XMLParser } from 'fast-xml-parser';
import { DiffResult, DiffElement } from '@/types';

interface BpmnElement {
  id: string;
  type: string;
  name?: string;
  attrs: Record<string, string>;
}

function parseElements(xml: string): Map<string, BpmnElement> {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    isArray: (tagName) => {
      const arrayTags = [
        'bpmn:startEvent', 'bpmn:endEvent', 'bpmn:task', 'bpmn:userTask',
        'bpmn:serviceTask', 'bpmn:scriptTask', 'bpmn:exclusiveGateway',
        'bpmn:parallelGateway', 'bpmn:inclusiveGateway', 'bpmn:sequenceFlow',
        'bpmn:subProcess', 'bpmn:callActivity', 'bpmn:intermediateCatchEvent',
        'bpmn:intermediateThrowEvent', 'bpmn:boundaryEvent', 'bpmn:receiveTask',
        'bpmn:sendTask', 'bpmn:manualTask', 'bpmn:businessRuleTask',
        'startEvent', 'endEvent', 'task', 'userTask',
        'serviceTask', 'scriptTask', 'exclusiveGateway',
        'parallelGateway', 'inclusiveGateway', 'sequenceFlow',
        'subProcess', 'callActivity', 'intermediateCatchEvent',
        'intermediateThrowEvent', 'boundaryEvent', 'receiveTask',
        'sendTask', 'manualTask', 'businessRuleTask',
      ];
      return arrayTags.includes(tagName);
    },
  });

  const parsed = parser.parse(xml);
  const elements = new Map<string, BpmnElement>();

  function extractElements(obj: Record<string, unknown>, parentType: string = '') {
    if (!obj || typeof obj !== 'object') return;

    for (const [key, value] of Object.entries(obj)) {
      if (key.startsWith('@_')) continue;

      if (Array.isArray(value)) {
        for (const item of value) {
          if (item && typeof item === 'object' && item['@_id']) {
            const id = item['@_id'] as string;
            const attrs: Record<string, string> = {};
            for (const [ak, av] of Object.entries(item)) {
              if (ak.startsWith('@_')) attrs[ak.replace('@_', '')] = String(av);
            }
            elements.set(id, {
              id,
              type: key.replace('bpmn:', ''),
              name: (item['@_name'] as string) || undefined,
              attrs,
            });
            extractElements(item as Record<string, unknown>, key);
          }
        }
      } else if (value && typeof value === 'object') {
        const val = value as Record<string, unknown>;
        if (val['@_id']) {
          const id = val['@_id'] as string;
          const attrs: Record<string, string> = {};
          for (const [ak, av] of Object.entries(val)) {
            if (ak.startsWith('@_')) attrs[ak.replace('@_', '')] = String(av);
          }
          elements.set(id, {
            id,
            type: key.replace('bpmn:', ''),
            name: (val['@_name'] as string) || undefined,
            attrs,
          });
          extractElements(val, key);
        } else {
          extractElements(val, parentType || key);
        }
      }
    }
  }

  extractElements(parsed);
  return elements;
}

export function diffBpmnXml(sourceXml: string, targetXml: string): DiffResult {
  const sourceElements = parseElements(sourceXml);
  const targetElements = parseElements(targetXml);

  const added: DiffElement[] = [];
  const removed: DiffElement[] = [];
  const modified: DiffElement[] = [];

  for (const [id, target] of targetElements) {
    const source = sourceElements.get(id);
    if (!source) {
      added.push({ id: target.id, type: target.type, name: target.name });
    } else {
      const sourceAttrs = JSON.stringify(source.attrs);
      const targetAttrs = JSON.stringify(target.attrs);
      if (sourceAttrs !== targetAttrs || source.type !== target.type) {
        modified.push({ id: target.id, type: target.type, name: target.name });
      }
    }
  }

  for (const [id, source] of sourceElements) {
    if (!targetElements.has(id)) {
      removed.push({ id: source.id, type: source.type, name: source.name });
    }
  }

  return { added, removed, modified };
}
