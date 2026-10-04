import { defineDomainServiceKit } from "nexusengine/domain-service-kit";
import { observationDigest } from "nexusengine/domains/runtime/data/observation";

export function adapterKit({ id, domain, domainPath, parentDomainPath, apiName, requires = [], provides = [], config = {}, createApi, systems = [], install }) {
  return defineDomainServiceKit({
    id, domain, domainPath, parentDomainPath, apiName, version: "0.1.0", stability: "candidate",
    services: ["adapter"], requires, provides, systems, createApi, install,
    metadata: { contentFingerprint: observationDigest({ id, version: "0.1.0", config }), purpose: `Optional ${id} provider` }
  });
}
