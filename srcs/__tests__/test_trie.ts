import { Trie, Node, NodeMetadata, NodeMaterial } from '../trie';

function getDefaultTrie(): Trie {
    const trie = new Trie();
    trie.addNode("cgroup", new NodeMaterial("PKM/contents/cgroup.md"));
    trie.addNode("closure", new NodeMaterial("PKM/contents/Closure.md"));
    trie.addNode("docker", new NodeMaterial("PKM/contents/Docker.md"));
    trie.addNode("database", new NodeMaterial("PKM/contents/Database.md"));
    trie.addNode("docker cli", new NodeMaterial("PKM/contents/Docker CLI.md"));
    trie.addNode("dockerfile", new NodeMaterial("PKM/contents/Dockerfile.md"));

    /**
     * intended usage is suggesting possible materials, not user gives content nor materials. it's for testing
     */
    const docker = trie.findNode("docker");
    const docker_content = docker?.getMaterial("PKM/contents/Docker.md")?.readContent();
    return trie;
}

const trie = getDefaultTrie();
console.log(trie.roots.get('d')?.metadata.promisingMaterials[0]);

describe('Trie material suggestion - count usage', () => {
    test('docker on the first suggest', () => {
        // This is wrong use of test. This is for sake of testing the testing.
        expect(trie.roots.get('d')?.metadata.promisingMaterials[0]?.useCount).toBe(1);
    })
});