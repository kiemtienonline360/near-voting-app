import { Context, PersistentMap, logging, u128, env } from 'near-sdk-as'
import { Voting, votingInfos, votingUsers } from './model';

// Users who want to vote need to deposit at least 0.1 NEAR
// This will help prevent users from spamming
const MIN_VOTE_AMOUNT = u128.from("100000000000000000000000");

// Get current voting
function _getVotingInfo(): Voting | null {
    let len = votingInfos.length;
    if (len>0) return votingInfos[len-1];
    return null;
}

// Allows users to create new voting
// Don't check user permissions so anyone can create
// It's convenient that other people can run the contract as well.
// But for real implementation, you have to check the permissions, only the owner has the right to create votes
export function createVoting(content: string): bool {
    // Checking
    assert(content, "You must enter the content!");
    let currVote = _getVotingInfo();
    if (currVote) {
        assert(currVote.status==2, "The vote is not ended. You can not create new voting!");
    }
    
    // Create new vote and store into blockchain
    // The id of the vote is its position in the array
    let id = votingInfos.length;
    let item = new Voting(id, Context.sender, content);
    item.startVote();                                       // Reduce action for users
    votingInfos.push(item);

    // Create votingUser and store it into blockchain
    let votingUser = new PersistentMap<string, string>(`voting_users_${id}`);
    votingUsers.set(id, votingUser);

    return true;
}

// Allows users to add candidate to the current voting
export function addCandidate(candidate: string): bool {
    // Checking
    let currVote = _getVotingInfo();
    assert(currVote!=null, "There is no voting!");
    assert(candidate!="", "Invalid input");
    
    if (currVote) {
        // Checking more
        assert(currVote.status==0 || currVote.status==1, "The vote is ended. You can not add candidate!");
        // assert(currVote.owner==Context.sender, "You is not owner of current vote!");
        assert(!currVote.isCandidateExisted(candidate), "The candidate is existed!");
    
         // Add candidate to the current voting and store it into blockchain
        currVote.addCandidate(candidate);
        votingInfos.replace(votingInfos.length-1, currVote);

        return true;
    }

    return false;
}

// Allow to start voting
export function startVote(): bool {
    // Checking
    let currVote = _getVotingInfo();
    assert(currVote!=null, "There is no voting!");
    if (currVote) {
        // Checking more
        assert(currVote.status==0, "The vote is running or ended. You can not start voting!");
        // assert(currVote.owner==Context.sender, "You is not owner of current vote!");
        
        // Update current voting and store it into blockchain
        currVote.startVote();
        votingInfos.replace(votingInfos.length-1, currVote);
    }
    return true;
}

// Close voting
export function endVote(): bool {
    // Checking
    let currVote = _getVotingInfo();
    assert(currVote!=null, "There is no voting!");
    if (currVote) {
        // Checking more
        assert(currVote.status==1, "The vote is not running. You can not end voting!");
        // assert(currVote.owner==Context.sender, "You is not owner of current vote!");

        // Update current voting and store it into blockchain
        currVote.endVote();
        votingInfos.replace(votingInfos.length-1, currVote);
    }
    return true;
}

// Users vote for their favorite candidate
export function vote(candidateId: i32): bool {
    // Checking
    let currVote = _getVotingInfo();
    assert(currVote!=null, "There is no voting!");
    if (currVote) {
        // Checking more
        assert(currVote.status==1, "The vote is not running. You can not vote!");
        // assert(currVote.owner!=Context.sender, "The owner has not right to vote!");
        assert(candidateId>=0 && candidateId<currVote.candidates.length, "The candidateId is invalid!");

         // Check deposit
        let attachedDeposit = Context.attachedDeposit;
        assert(u128.ge(attachedDeposit, MIN_VOTE_AMOUNT), "You must deposit 0.5 NEAR to vote!");

        // Checking account
        let votingUser = votingUsers.get(currVote.id);
        assert(votingUser!=null, "Invalid data!");

        if (votingUser) {
            // Checking more
            assert(votingUser.get(Context.sender)==null, "You has voted before!");

            // Update votingUser and store it into blockchain
            votingUser.set(Context.sender, `${candidateId}`);
            votingUsers.set(currVote.id, votingUser);

            // Increase vote for the candidate and store it into blockchain
            currVote.increaseVote(candidateId);
            votingInfos.replace(votingInfos.length-1, currVote);

            return true;
        }
    }
    return false;
}

// Get information of current voting / lastest voting
export function votingInfo(): Voting | null {
    return _getVotingInfo();
}

// Get information of any voting
export function votingInfoById(votingId: i32): Voting | null {
    let len = votingInfos.length;
    if (len>0 && votingId>=0 && votingId<votingInfos.length) return votingInfos[votingId];
    return null;
}