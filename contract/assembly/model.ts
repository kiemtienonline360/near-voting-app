import { env, PersistentVector, PersistentMap } from "near-sdk-as";

// Declare data structure of a candidate
@nearBindgen
export class Candidate {
    id: i32;
    name: string;
    vote: u32;

    constructor(_id: i32, _name: string) {
        this.id = _id;
        this.name = _name;
        this.vote = 0;
    }
}

// Declare data structure of a voting
@nearBindgen
export class Voting {
    id: i32;
    owner: string;                          // The account created this voting
    content: string;                        // The content of this voting
    status: i32;                            // 0: New - 1: Running - 2: Close
    startTime: u64;
    startBlock: u64;
    endTime: u64;
    endBlock: u64;
    candidates: Candidate[];

    // Contructor function
    constructor(_id: i32, _owner: string, _content: string) {
        this.id = _id;
        this.owner = _owner;
        this.content = _content;
        this.status = 0;
        this.startTime = 0;
        this.startBlock = 0;
        this.endTime = 0;
        this.endBlock = 0;
        this.candidates = [];
    }

    // Allow to start voting
    startVote(): void {
        this.status = 1;
        this.startTime = env.block_timestamp();
        this.startBlock = env.block_index();
    }

    // Close voting
    endVote(): void {
        this.status = 2;
        this.endTime = env.block_timestamp();
        this.endBlock = env.block_index();
    }

    // Add a candidate to the voting
    addCandidate(candidate: string): void {
        let id = this.candidates.length;
        let item = new Candidate(id, candidate);
        this.candidates.push(item);
    }

    // Check a candidate is existed?
    isCandidateExisted(candidate: string): bool {
        for (let idx=0; idx<this.candidates.length; idx++) {
            if (this.candidates[idx].name==candidate) return true;
        }
        return false;
    }

    // Increase vote for a candidate
    increaseVote(candidateId: i32): void {
        this.candidates[candidateId].vote++;
    }
}

// Store the information of votings to the blockchain
export const votingInfos = new PersistentVector<Voting>("voting_infos");

// Store the information of the elected accounts
// We use it to check to make sure the account only votes once
export const votingUsers = new PersistentMap<i32, PersistentMap<string, string>>("voting_users");