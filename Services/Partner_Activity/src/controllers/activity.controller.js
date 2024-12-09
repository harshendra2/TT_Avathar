const { Worker, isMainThread, parentPort, workerData } = require("worker_threads");
const { Promise } = require("mongoose");
const { clearStoreTeamstatistics } = require('../config/redis');
const db = require("../models");
const Referral = db.referrals;
const Nft = db.nfts;
const Mintnft = db.mintnfts;
const Teamstatistic = db.teamstatistics;

exports.CheckReffer = (req, res) => {
    const sponsoraddress = req.body.sponsoraddress;
    const myaddress = req.body.myaddress;
    
    checkrfferaddresstree(sponsoraddress)
        .then(totalPartners => {
            if (totalPartners.includes(myaddress)) {
                return res.status(200).send({ status: false, message: "My address is present in total partners." });
            }
            res.status(200).send({ status: true, message: "User data updates successfully" });
        })
        .catch(error => {
            console.error('Error occurred at line:', error.stack);
            res.status(500).json({ status: false, error: 'Internal Server Error' });
        });
};

async function checkrfferaddresstree(address) {
    try {
        let totalPartners = [];
        const ReferralData = await Referral.find({ myaddress: address });
        const promises = ReferralData.map(async (ReferralAddress) => {
            totalPartners.push(ReferralAddress.sponsoraddress);
            const partnersInBranch = await checkrfferaddresstree(ReferralAddress.sponsoraddress);
            totalPartners = totalPartners.concat(partnersInBranch);
        });

        await Promise.all(promises);
        return totalPartners;
    } catch (err) {
        throw new Error(err.message || "Internal server error while getting total partners.");
    }
}


exports.StoreTeamstatistics = (req, res) => {
    const userAddress = req.body.userAddress;
    
    StoreActivity(userAddress)
        .then(totalPartners => {
            SelfActivity(userAddress);
            res.status(200).send({ status: true, message: "User data updates successfully" });
        })
        .catch(error => {
            console.error('Error occurred at line:', error.stack);
            res.status(500).json({ status: false, error: 'Internal Server Error' });
        });
};

async function SelfActivity(address) {
    try {
          
        const userAddress = address.toString().toLowerCase();
            
        const userData = await Mintnft.aggregate([
            {
                $match: {
                    useraddress: userAddress,
                },
            },
            {
                $graphLookup: {
                    from: "mintnfts",
                    startWith: "$useraddress",
                    connectFromField: "useraddress",
                    connectToField: "referreraddress",
                    as: "childrenData",
                },
            },
            {
                $project: {
                    combinedAddresses: {
                        $concatArrays: [
                            [{ address: "$useraddress", role: "self" }],
                            [{ address: "$referreraddress", role: "parent" }],
                            {
                                $map: {
                                    input: "$childrenData",
                                    as: "child",
                                    in: { address: "$$child.useraddress", role: "child" },
                                },
                            },
                        ],
                    },
                },
            },
        ]);
    
    
        // Check if userData exists and has results before accessing combinedAddresses
        const allAddress = (userData.length > 0 && userData[0].combinedAddresses)
            ? userData[0].combinedAddresses
            : [{ address: userAddress, role: "self" }];
    

          const promises = allAddress.map(async (row) => {
           
            const userAddress = row.address.toString();
            const [
                totalPartners,
                teamSale,
                teamSaleLastWeek,
                teamsaleprivousweek,
                rankData,
                ownNft,
            ] = await Promise.all([
                getTotalPartners(userAddress),
                getTeamSaleVolume(userAddress),
                getTeamSaleVolumeThisWeek(userAddress),
                getTeamSaleVolumeLastWeek(userAddress),
                getUserRankup(userAddress),
                Mintnft.findOne({ useraddress: userAddress }).sort({ updatedAt: -1 }),
            ]);

            const NftData = ownNft ? await Nft.findOne({ level: ownNft.level }) : null;

            const Partneractivity = {
                "ownnft": NftData ? NftData.nft : null,
                "totalpartners": totalPartners,
                "rank": rankData ? rankData : 0,
                "teamsale": teamSale,
                "teamsalelastweek": teamSaleLastWeek,
                "teamsaleprivousweek": teamsaleprivousweek
            };

            const TeamstatisticData = await Teamstatistic.findOne({ walletaddress: userAddress });
            if (TeamstatisticData) {
                if (TeamstatisticData.adminchangestatus === false) {
                    await Teamstatistic.findOneAndUpdate({ walletaddress: userAddress }, Partneractivity, { useFindAndModify: false });
                } else if (TeamstatisticData.adminchangestatus === true && TeamstatisticData.rank < rankData) {
                    Partneractivity.adminchangestatus = false;
                    await Teamstatistic.findOneAndUpdate({ walletaddress: userAddress }, Partneractivity, { useFindAndModify: false });
                }
            } else {
                const teamstatisticInsert = new Teamstatistic({
                    "walletaddress": userAddress,
                    "ownnft": NftData ? NftData.nft : null,
                    "totalpartners": totalPartners,
                    "rank": rankData ? rankData : 0,
                    "teamsale": teamSale,
                    "teamsaleprivousweek": teamsaleprivousweek,
                    "teamsalelastweek": teamSaleLastWeek
                });
                await teamstatisticInsert.save();
            }
            clearStoreTeamstatistics(userAddress);
        });

        await Promise.all(promises);  
      
 } catch (err) {
        throw new Error(err.message || "Internal server error while getting total partners.");
    }
}

async function StoreActivity(address) {
    try {
        const ReferralData = await Referral.find({ myaddress: address });
        const promises = ReferralData.map(async (MintuserAddress) => {

            const userAddress = MintuserAddress.sponsoraddress.toString();

            const [
                totalPartners,
                teamSale,
                teamSaleLastWeek,
                teamsaleprivousweek,
                rankData,
                ownNft,
            ] = await Promise.all([
                getTotalPartners(userAddress),
                getTeamSaleVolume(userAddress),
                getTeamSaleVolumeThisWeek(userAddress),
                getTeamSaleVolumeLastWeek(userAddress),
                getUserRankup(userAddress),
                Mintnft.findOne({ useraddress: userAddress }).sort({ updatedAt: -1 }),
            ]);

            const NftData = ownNft ? await Nft.findOne({ level: ownNft.level }) : null;

            const Partneractivity = {
                "ownnft": NftData ? NftData.nft : null,
                "totalpartners": totalPartners,
                "rank": rankData ? rankData : 0,
                "teamsale": teamSale,
                "teamsalelastweek": teamSaleLastWeek,
                "teamsaleprivousweek": teamsaleprivousweek
            };
    
            const TeamstatisticData = await Teamstatistic.findOne({ walletaddress: userAddress });
            if (TeamstatisticData) {
                if (TeamstatisticData.adminchangestatus === false) {
                    await Teamstatistic.findOneAndUpdate({ walletaddress: userAddress }, Partneractivity, { useFindAndModify: false });
                } else if (TeamstatisticData.adminchangestatus === true && TeamstatisticData.rank < rankData) {
                    Partneractivity.adminchangestatus = false;
                    await Teamstatistic.findOneAndUpdate({ walletaddress: userAddress }, Partneractivity, { useFindAndModify: false });
                }
            } else {
                const TeamstatisticData = await Teamstatistic.findOne({ walletaddress: userAddress });
                if (TeamstatisticData) {
                    await Teamstatistic.findOneAndUpdate({ walletaddress: userAddress }, Partneractivity, { useFindAndModify: false });
                }else{
                    const teamstatisticInsert = new Teamstatistic({
                        "walletaddress": userAddress,
                        "ownnft": NftData ? NftData.nft : null,
                        "totalpartners": totalPartners,
                        "rank": rankData ? rankData : 0,
                        "teamsale": teamSale,
                        "teamsaleprivousweek": teamsaleprivousweek,
                        "teamsalelastweek": teamSaleLastWeek
                    });
                    await teamstatisticInsert.save();
                }
            }


          clearStoreTeamstatistics(userAddress);
            await StoreActivity(userAddress);
           
        });
       await Promise.all(promises);
 } catch (err) {
        throw new Error(err.message || "Internal server error while getting total partners.");
    }
}


async function getTotalPartners(address) {
    try {
        const result = await Referral.aggregate([
            {
                $match: {
                    sponsoraddress: address
                }
            },
            {
                $graphLookup: {
                    from: 'referrals',
                    startWith: '$myaddress',
                    connectFromField: 'myaddress',
                    connectToField: 'sponsoraddress',
                    as: 'totalPartners',
                    maxDepth: 300 // Optional: limit the recursion depth
                }
            },
            {
                $project: {
                    totalPartnersCount: { $size: '$totalPartners' } // Number of referred partners
                }
            },
            {
                $group: {
                    _id: null,
                    totalPartners: { $sum: '$totalPartnersCount' },
                    directPartners: { $sum: 1 } 
                }
            },
            {
                $project: {
                    totalPartnersCount: { 
                        $add: [
                            '$totalPartners', // Sum of all referred partners
                            '$directPartners' // Number of direct sponsors
                        ]
                    }
                }
            }
        ]);
        
        const totalPartnersCount = result.length > 0 ? result[0].totalPartnersCount : 0;
        return totalPartnersCount;
      
    } catch (err) {
        throw new Error(err.message || "Internal server error while getting total partners.");
    }
}


async function getTeamSaleVolume(address) {

    const result = await Referral.aggregate([
        {
            $match: { sponsoraddress: address }
        },
        {
            $graphLookup: {
                from: 'referrals',
                startWith: '$myaddress',
                connectFromField: 'myaddress',
                connectToField: 'sponsoraddress',
                as: 'subtree',
                maxDepth: 300  // Adjust depth limit as per your data structure
            }
        },
        {
            $lookup: {
                from: 'mintnfts',
                let: { useraddress: '$myaddress' },
                pipeline: [
                    {
                        $match: {
                            $expr: { $eq: ['$useraddress', '$$useraddress'] }
                        }
                    },
                    {
                        $group: {
                            _id: null,
                            mintpriceSum: { $sum: '$mintprice' }
                        }
                    }
                ],
                as: 'mintData'
            }
        },
        {
            $unwind: {
                path: '$mintData',
                preserveNullAndEmptyArrays: true
            }
        },
        {
            $addFields: {
                totalMintPrice: { $ifNull: ['$mintData.mintpriceSum', 0] }
            }
        },
        {
            $lookup: {
                from: 'mintnfts',
                let: { subtreeAddresses: '$subtree.myaddress' },
                pipeline: [
                    {
                        $match: {
                            $expr: { $in: ['$useraddress', '$$subtreeAddresses'] }
                        }
                    },
                    {
                        $group: {
                            _id: null,
                            totalSubtreeMintPrice: { $sum: '$mintprice' }
                        }
                    }
                ],
                as: 'subtreeMintData'
            }
        },
        {
            $unwind: {
                path: '$subtreeMintData',
                preserveNullAndEmptyArrays: true
            }
        },
        {
            $group: {
                _id: null,
                totalInvestment: {
                    $sum: {
                        $add: [
                            { $ifNull: ['$totalMintPrice', 0] },
                            { $ifNull: ['$subtreeMintData.totalSubtreeMintPrice', 0] }
                        ]
                    }
                }
            }
        }
    ]);
    
    const totalInvestment = result.length > 0 ? result[0].totalInvestment : 0;

    return totalInvestment;   
}



async function getTeamSaleVolumeThisWeek(address) {
  
    const now = new Date();
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
    startOfWeek.setHours(0, 0, 0, 0);

    const result = await Referral.aggregate([
        {
            $match: { sponsoraddress: address }
        },
        {
            $graphLookup: {
                from: 'referrals',
                startWith: '$myaddress',
                connectFromField: 'myaddress',
                connectToField: 'sponsoraddress',
                as: 'subtree',
                maxDepth: 100  // Adjust depth limit as per your data structure
            }
        },
        {
            $lookup: {
                from: 'mintnfts',
                let: { useraddress: '$myaddress', subtreeAddresses: '$subtree.myaddress' },
                pipeline: [
                    {
                        $match: {
                            $expr: {
                                $and: [
                                    { $or: [
                                        { $eq: ['$useraddress', '$$useraddress'] },
                                        { $in: ['$useraddress', '$$subtreeAddresses'] }
                                    ] },
                                    { $gte: ['$createdAt', new Date(startOfWeek)] }
                                ]
                            }
                        }
                    },
                    {
                        $group: {
                            _id: null,
                            mintpriceSum: { $sum: '$mintprice' }
                        }
                    }
                ],
                as: 'mintData'
            }
        },
        {
            $unwind: {
                path: '$mintData',
                preserveNullAndEmptyArrays: true
            }
        },
        {
            $addFields: {
                directMintPrice: { $ifNull: ['$mintData.mintpriceSum', 0] },
                subtreeMintPrice: { $ifNull: ['$subtreeMintData.subtreeMintPriceSum', 0] }
            }
        },
        {
            $group: {
                _id: null,
                totalInvestment: { $sum: { $add: ['$directMintPrice', '$subtreeMintPrice'] } }
            }
        },
        {
            $project: {
                _id: 0,
                totalInvestment: 1
            }
        }
    ]);
    
    const totalInvestment = result.length > 0 ? result[0].totalInvestment : 0;
    return totalInvestment;  
}


async function getTeamSaleVolumeLastWeek(address) {
    const now = new Date();
    const startOfPreviousWeek = new Date(now.setDate(now.getDate() - now.getDay() - 7));
    startOfPreviousWeek.setHours(0, 0, 0, 0);
    const endOfPreviousWeek = new Date(now.setDate(now.getDate() - now.getDay() + 6));
    endOfPreviousWeek.setHours(23, 59, 59, 999);

    const result = await Referral.aggregate([
        {
            $match: { sponsoraddress: address }
        },
        {
            $graphLookup: {
                from: 'referrals',
                startWith: '$myaddress',
                connectFromField: 'myaddress',
                connectToField: 'sponsoraddress',
                as: 'subtree',
                maxDepth: 100 
            }
        },
        {
            $lookup: {
                from: 'mintnfts',
                let: { useraddress: '$myaddress', startOfPreviousWeek: startOfPreviousWeek, endOfPreviousWeek: endOfPreviousWeek },
                pipeline: [
                    {
                        $match: {
                            $expr: {
                                $and: [
                                    { $eq: ['$useraddress', '$$useraddress'] },
                                    { $gte: ['$createdAt', '$$startOfPreviousWeek'] },
                                    { $lt: ['$createdAt', '$$endOfPreviousWeek'] }
                                ]
                            }
                        }
                    },
                    {
                        $group: {
                            _id: null,
                            mintpriceSum: { $sum: '$mintprice' }
                        }
                    }
                ],
                as: 'mintData'
            }
        },
        {
            $unwind: {
                path: '$mintData',
                preserveNullAndEmptyArrays: true
            }
        },
        {
            $lookup: {
                from: 'mintnfts',
                let: { subtreeAddresses: '$subtree.myaddress', startOfPreviousWeek: startOfPreviousWeek, endOfPreviousWeek: endOfPreviousWeek },
                pipeline: [
                    {
                        $match: {
                            $expr: {
                                $and: [
                                    { $in: ['$useraddress', '$$subtreeAddresses'] },
                                    { $gte: ['$createdAt', '$$startOfPreviousWeek'] },
                                    { $lt: ['$createdAt', '$$endOfPreviousWeek'] }
                                ]
                            }
                        }
                    },
                    {
                        $group: {
                            _id: null,
                            mintpriceSum: { $sum: '$mintprice' }
                        }
                    }
                ],
                as: 'subtreeMintData'
            }
        },
        {
            $unwind: {
                path: '$subtreeMintData',
                preserveNullAndEmptyArrays: true
            }
        },
        {
            $group: {
                _id: null,
                totalMintPrice: {
                    $sum: {
                        $add: [
                            { $ifNull: ['$mintData.mintpriceSum', 0] },
                            { $ifNull: ['$subtreeMintData.mintpriceSum', 0] }
                        ]
                    }
                }
            }
        }
    ]);
    
    const totalInvestment = result.length > 0 ? result[0].totalMintPrice : 0;
    return totalInvestment;  

}


async function getUserRankup(address) {

    const teamStatisticData = await Teamstatistic.findOne({ walletaddress: address });
    let teamSaleVolume = teamStatisticData ? teamStatisticData.teamsale : 0;

    const adminChangeStatus = teamStatisticData?.adminchangestatus || false;
    const currentRank = teamStatisticData?.rank || 0;


    const thresholds = [25000, 75000, 225000, 675000, 2025000, 6075000, 18225000];
    for (let nftLevel = 7; nftLevel >= 1; nftLevel--) {
        const getCheckHoldNft = await CheckHoldNft(address, nftLevel);
        const getThresholdData = thresholds[nftLevel - 1] || 0;

        if (!getCheckHoldNft || teamSaleVolume < getThresholdData) {
            continue;
        }
        if (nftLevel === 1 || await getRankUplifting(address, nftLevel - 1, thresholds[nftLevel - 2] || 0)) {
            if (adminChangeStatus) {
                if ((nftLevel === 1 && currentRank > nftLevel) || (nftLevel !== 1 && currentRank < nftLevel)) {
                    return currentRank;
                }
            }
            return nftLevel;
        }
    }

    return 0;
}



async function CheckHoldNft(address, nftLevel) {
    const MintnftData = await Mintnft.findOne({ useraddress: address, level:{$gte:nftLevel }});
    if (MintnftData) {
        return true;
    }
    return false;
}

async function getRankUplifting(user, nftLevel, requiredAmount) {
    const ReferralData = await Referral.find({ sponsoraddress: user });
    let memberRankCount = 0;

    const promises = ReferralData.map(async (referral) => {
        const member = referral.myaddress;
        const [TeamstatisticData, MintnftData, TeamSale] = await Promise.all([
            Teamstatistic.findOne({ walletaddress: member }),
            CheckHoldNft(member, nftLevel),
            getTeamSaleVolume(member),
        ]);

        const adminchangestatus = TeamstatisticData?.adminchangestatus || false;
        const teamstatisticrank = TeamstatisticData?.rank || 0;
        let isSatisfied = false;

        if (adminchangestatus && teamstatisticrank >= nftLevel) {
            memberRankCount++;
            isSatisfied = true;
        } else if (MintnftData && teamstatisticrank >= nftLevel && TeamSale >= requiredAmount) {
            if (requiredAmount === 25000) {
                memberRankCount++;
                isSatisfied = true;
                if (adminchangestatus && teamstatisticrank >= nftLevel) {
                    memberRankCount--;
                    isSatisfied = false;
                }
            } else {
                const amounts = [25000, 75000, 225000, 675000, 2025000, 6075000];
                const newNFTLevel = nftLevel - 1;
                const newAmount = amounts[nftLevel - 2] || 0;

                if (await getRankUplifting(member, newNFTLevel, newAmount)) {
                    memberRankCount++;
                    isSatisfied = true;
                    if (adminchangestatus && teamstatisticrank >= nftLevel) {
                        memberRankCount--;
                        isSatisfied = false;
                    }
                }
            }
        }

        if (memberRankCount < 3 && !isSatisfied && TeamSale >= requiredAmount) {
            const found = await legSearch(member, nftLevel, requiredAmount);
            if (found) {
                memberRankCount++;
            }
        }

        return memberRankCount >= 3;
    });

    const results = await Promise.all(promises);
    return results.includes(true);
}



async function legSearch(member, nftLevel, amount) {
    const ReferralData = await Referral.find({ sponsoraddress: member });
    if (ReferralData.length === 0) {
        return false;
    }

    const promises = ReferralData.map(async (referral) => {
        const referrer = referral.myaddress;
        const [TeamstatisticData, MintnftData, referrerTeamSale] = await Promise.all([
            Teamstatistic.findOne({ walletaddress: referrer }),
            CheckHoldNft(referrer, nftLevel),
            getTeamSaleVolume(referrer),
        ]);

        const adminchangestatus = TeamstatisticData?.adminchangestatus || false;
        const teamstatisticrank = TeamstatisticData?.rank || 0;

        if (adminchangestatus && teamstatisticrank >= nftLevel) {
            return true;
        }

        if (!adminchangestatus && MintnftData && teamstatisticrank >= nftLevel && referrerTeamSale >= amount) {
            if (amount === 25000) {
                return true;
            } else {
                const amounts = [25000, 75000, 225000, 675000, 2025000, 6075000];
                const newNftLevel = nftLevel - 1;
                const newAmount = amounts[nftLevel - 2] || 0;

                if (await getRankUplifting(referrer, newNftLevel, newAmount)) {
                    return true;
                }
            }
        }

        return legSearch(referrer, nftLevel, amount);
    });

    const results = await Promise.all(promises);
    return results.includes(true);
}
