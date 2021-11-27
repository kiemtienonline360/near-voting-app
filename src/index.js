import 'regenerator-runtime/runtime'

import { initContract, login, logout } from './utils'

import getConfig from './config'
const { networkId } = getConfig(process.env.NODE_ENV || 'development')

// global variable used throughout
let currentVoting = null;
let currentVotingUsers = null;
window.voteCadidate = voteCadidate;
window.closeAddCandidateForm = closeAddCandidateForm;
window.closeCreateVotingForm = closeCreateVotingForm;
window.closeVoting = closeVoting;

// `nearInitPromise` gets called on page load
window.nearInitPromise = initContract()
    .then(() => {
        if (window.walletConnection.isSignedIn()) signedInFlow()
        else signedOutFlow()
    })
    .catch(console.error);

async function voteCadidate(candidateId) {
    try {
        const nearDeposit = "100000000000000000000000";
        const BOATLOAD_OF_GAS = (60*10**12).toFixed();
        // make an update call to the smart contract
        let resp = await window.contract.vote({ candidateId: candidateId }, BOATLOAD_OF_GAS, nearDeposit);
        console.log("Vote Candidate", candidateId, resp);
    } catch (e) {
        console.error("Unable to call voteCadidate() function", candidateId, e);
    }
}

async function initUI() {
    // Update current voting
    await updateCurrentVoting();
    if (currentVoting && currentVoting.status!=2) {
        // Voting is running
        document.querySelector("#btnShowCreateVotingForm").style.display = "none";
        document.querySelector("#btnShowCandidateForm").style.display = "block";
        document.querySelector("#btnEndVoting").style.display = "block";
    } else {
        document.querySelector("#btnShowCreateVotingForm").style.display = "block";
        document.querySelector("#btnShowCandidateForm").style.display = "none";
        document.querySelector("#btnEndVoting").style.display = "none";
    }
    document.querySelector("#currentVotingInfo").innerHTML = renderCurrentVoting();

    // Show "Add Candidate" form
    document.querySelector("#btnShowCandidateForm").onclick = function() {
        document.querySelector("#addCandidateContainer").style.display = "block";
        document.querySelector("#currentVotingContainer").style.display = "none";
    };

    // Show "Create Voting" form
    document.querySelector("#btnShowCreateVotingForm").onclick = function() {
        document.querySelector("#createVotingContainer").style.display = "block";
        document.querySelector("#currentVotingContainer").style.display = "none";
    };
}

function getTime(blockTime) {
    let d = new Date(blockTime/1000000);
    return (d.toLocaleDateString() + " " + d.toLocaleTimeString());
}

function renderCurrentVoting() {
    let html = "There is no voting. Please create new voting!!!";
    if (currentVoting) {
        html = "";
        html += `<div><b>${currentVoting.owner}</b> is created at ${getTime(currentVoting.startTime)}</div>`;
        html += `<hr />`;
        html += `<div style="padding-left:10px">`;
        if (currentVoting.content) html += `${currentVoting.content}`;
        if (currentVoting.candidates.length>0) {
            html += `<ol>`;
            currentVoting.candidates.forEach(item => {
                html += `<li><font color="#00008b">${item.name}</font>: <b>${item.vote}</b> votes`;
                if (currentVoting.status==1) {
                    html += ` (<a href="javascript:voteCadidate(${item.id})">Vote</a>)`;
                }
            });
            html += `</ol>`;
        } else {
            html += `<div style="color:red">Please add a candidate for this voting!!!</div>`;
        }
        if (currentVoting.status==1) {
            html += `<div style="color:blue">This voting is running. Please vote for favourite candidate now!</div>`;
        } else {
            html += `<div style="color:red">This voting is ended at ${getTime(currentVoting.endTime)}!!!</div>`;
        }
        html += `</div>`;
    }
    return html;
}

// Update current voting
async function updateCurrentVoting() {
    try {
        // make an update call to the smart contract
        currentVoting = await window.contract.votingInfo({});
        console.log("Current Voting", currentVoting);
        if (currentVoting) {
            currentVotingUsers = await window.contract.getVotingUsers({votingId: currentVoting.id});
            console.log("Current Voting Users", currentVotingUsers);
        }
    } catch (e) {
        console.error("Unable to call votingInfo() function", e);
    }
}

function closeAddCandidateForm() {
    document.querySelector("#addCandidateContainer").style.display = "none";
    document.querySelector("#currentVotingContainer").style.display = "block";
}

function closeCreateVotingForm() {
    document.querySelector("#addCandidateContainer").style.display = "none";
    document.querySelector("#currentVotingContainer").style.display = "block";
}

async function closeVoting() {
    try {
        let resp = await window.contract.endVote({ });
        console.log("Close Voting", resp);
    } catch (e) {
        console.error("Unable to call closeVoting() function", e);
    }
}

document.querySelector('#createVotingForm').onsubmit = async (event) => {
    event.preventDefault()
    try {
        let content = document.querySelector("#votingContent").value;
        await window.contract.createVoting({
            content: content
        });
    } catch (e) {
        console.log("Create Voting ERROR", e);
    }
}

document.querySelector('#addCandidateForm').onsubmit = async (event) => {
    event.preventDefault();
    try {
        let candidateName = document.querySelector("#candidateName").value;
        await window.contract.addCandidate({
            candidate: candidateName
        });
    } catch (e) {
        console.log("Add Candidate ERROR", e);
    }
}

document.querySelector('#sign-in-button').onclick = login
document.querySelector('#sign-out-button').onclick = logout

// Display the signed-out-flow container
function signedOutFlow() {
    document.querySelector('#signed-out-flow').style.display = 'block'
}

// Displaying the signed in flow container and fill in account-specific data
function signedInFlow() {
    document.querySelector('#signed-in-flow').style.display = 'block'

    document.querySelectorAll('[data-behavior=account-id]').forEach(el => {
        el.innerText = window.accountId
    })

    // populate links in the notification box
    const accountLink = document.querySelector('[data-behavior=notification] a:nth-of-type(1)')
    accountLink.href = accountLink.href + window.accountId
    accountLink.innerText = '@' + window.accountId
    const contractLink = document.querySelector('[data-behavior=notification] a:nth-of-type(2)')
    contractLink.href = contractLink.href + window.contract.contractId
    contractLink.innerText = '@' + window.contract.contractId

    // update with selected networkId
    accountLink.href = accountLink.href.replace('testnet', networkId)
    contractLink.href = contractLink.href.replace('testnet', networkId)

    initUI();
}