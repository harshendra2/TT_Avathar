const { Promise } = require("mongoose");
const db = require("../models");
const { redisClient,clearStoreTeamstatistics,clearRedisKeysByPattern } = require('../config/redis');
const Referral = db.referrals;
const Nft = db.nfts;
const Mintnft = db.mintnfts;
const Teamstatistic = db.teamstatistics;

exports.Joinedpartner = async (req, res) => {
    const userAddress = req.params.address;
    try {
        const totalPartnerslist = await getTotalPartnerslist(userAddress);
        res.status(200).json({
            success: true,
            totalPartners: totalPartnerslist.length,
            partners: totalPartnerslist
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: err.message || "Internal server error while getting total partners."
        });
    }
};


async function getTotalPartnerslist(address) {
    try {
        const referralAggregation = [
            { $match: { sponsoraddress: address } },
            { $sort: { createdAt: -1 } },
            {
                $lookup: {
                    from: 'nfts',
                    localField: 'nft.0',
                    foreignField: 'level',
                    as: 'nftData'
                }
            },
            {
                $unwind: {
                    path: '$nftData',
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $addFields: {
                    nftData: { $ifNull: ['$nftData', null] },
                    lastNftValue: { $arrayElemAt: ['$nft', 0] }
                }
            },
            {
                $graphLookup: {
                    from: 'referrals',
                    startWith: '$myaddress',
                    connectFromField: 'myaddress',
                    connectToField: 'sponsoraddress',
                    as: 'nestedPartners',
                    maxDepth: 200
                }
            },
            {
                $unwind: {
                    path: '$nestedPartners',
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $lookup: {
                    from: 'nfts',
                    localField: 'nestedPartners.nft.0',
                    foreignField: 'level',
                    as: 'nestedNftData'
                }
            },
            {
                $unwind: {
                    path: '$nestedNftData',
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $addFields: {
                    'nestedPartners.nftData': { 
                        $cond: { 
                            if: { $ne: ['$nestedNftData', null] }, 
                            then: '$nestedNftData', 
                            else: '$REMOVE' 
                        }
                    },
                   'nestedPartners.lastNftValue': {
                        $cond: {
                            if: {
                                $and: [
                                    { $isArray: '$nestedPartners.nft' },
                                    { $gt: [{ $size: '$nestedPartners.nft' }, 0] }
                                ]
                            },
                            then: { $arrayElemAt: ['$nestedPartners.nft', 0] }, 
                            else: '$REMOVE' 
                        }
                    }
                }
            },            
            {
                $group: {
                    _id: '$myaddress',
                    myaddress: { $first: '$myaddress' },
                    lastNftValue: { $first: '$lastNftValue' },
                    updatedAt: { $first: '$updatedAt' },
                    nftData: { $first: '$nftData' },
                    createdAt: { $first: '$createdAt' },
                    nestedPartners: {
                        $push: {
                            $cond: [
                                { $ne: ['$nestedPartners', {}] },
                                '$nestedPartners',
                                '$REMOVE'
                            ]
                        }
                    }
                }
            },
            {
                $addFields: {
                    combinedPartners: {
                        $concatArrays: [
                            [{
                                myaddress: '$myaddress',
                                lastNftValue: '$lastNftValue',
                                updatedAt: '$updatedAt',
                                nftData: '$nftData',
                                createdAt: '$createdAt'
                            }],
                            '$nestedPartners'
                        ]
                    }
                }
            },
            {
                $unwind: {
                    path: '$combinedPartners',
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $replaceRoot: { newRoot: '$combinedPartners' }
            },
            {
                $project: {
                    myaddress: 1,
                    createdAt: 1,
                    updatedAt: 1,
                    nftData: 1,
                    lastNftValue: 1
                }
            },
            { $sort: { createdAt: -1 } },
            { $limit:10}
        ];
        
        const partnersList = await Referral.aggregate(referralAggregation);
        return partnersList;
    } catch (err) {
        throw new Error(err.message || "Internal server error while getting total partners.");
    }
}

exports.getUserTeamsTotal = async (req, res) => {
    try {
        const address = req.params.address;
        const userTeamStatistic = await Teamstatistic.findOne(
            { walletaddress: address }
        ).select('totalpartners teamsale -_id');

        if (!userTeamStatistic) {
            return res.status(404).send({ status: false, message: "User team statistics not found" });
        }

        res.send({ status: true, message: "Get total partners and team sale", data: userTeamStatistic });
    } catch (error) {
        res.status(500).send({ status: false, message: "Internal server error while fetching user team statistics" });
    }
};

exports.getOverallDetailTeamstatistics = (req, res) => {
    Teamstatistic.find()
        .then(data => {
            const modifiedData = data.map(item => {
                const teamTotalPriceSale = Math.round(item.teamsale * 110) / 100;
                const teamBVSale = Math.round(item.teamsale);
                return {
                    ...item.toObject(),
                    teamTotalPriceSale: teamTotalPriceSale,
                    teamBVSale: teamBVSale
                };
            });
            res.send({ status: true, message: "Get All List Of Team statistics", data: modifiedData });
        })
        .catch(err => {
            res.status(500).send({
                message: err.message || "Some error occurred while retrieving Team statistics."
            });
        });
};


exports.getoverallPriceBVSale = async (req, res) => {
    try {
        const data = await Teamstatistic.find();
        let totalOverallTeamTotalPriceSale = 0;
        let totalOverallTeamBVSale = 0;
        const modifiedData = data.map(item => {
            const overallTeamTotalPriceSale = Math.round(item.teamsale * 110) / 100;
            const overallTeamBVSale = Math.round(item.teamsale);
            totalOverallTeamTotalPriceSale += overallTeamTotalPriceSale;
            totalOverallTeamBVSale += overallTeamBVSale;
            return {
                overallTeamTotalPriceSale: +overallTeamTotalPriceSale,
                overallTeamBVSale: +overallTeamBVSale
            };
        });

        res.send({
            status: true,
            message: "Get All List Of Team statistics",
            data: {
                totalOverallTeamTotalPriceSale,
                totalOverallTeamBVSale
            }
        });
    } catch (err) {
        return res.status(500).send({
            status: false,
            message: err.message || "Some error occurred while retrieving Team statistics."
        });
    }
};

exports.getDirectDetailTeamstatistics= async (req, res) => {
    const address = req.params.address;

    try {
        const data = await Teamstatistic.findOne({walletaddress:address }).lean();
    
        if (!data) {
          return res.status(404).send({
            status: false,
            message: `Team statistic not found for address ${address}`
          });
        }
    
        data.teamTotalPriceSale = Math.round(data.teamsale * 110) / 100;
        data.teamBVSale = Math.round(data.teamsale);
        
        res.send({
          status: true,
          message: `Get Team statistics for address ${address}`,
          data: data
        });
    } catch (err) {
        res.status(500).send({
          message: err.message || "Some error occurred while retrieving the Team statistic."
        });
    }
};

exports.processTotalUserRank = async (req, res) => {
    try {
        const uniqueUserAddresses = await Mintnft.find({
            useraddress: { $exists: true, $ne: null, $ne: "" }
        }).distinct("useraddress");

        const rankDataPromises = uniqueUserAddresses.map(address => getUserRankup(address));
        const rankDataResults = await Promise.all(rankDataPromises);

        const partnerActivities = uniqueUserAddresses.map((address, index) => ({
            walletaddress: address,
            rank: rankDataResults[index] || 0
        }));

        const teamStatistics = await Teamstatistic.find({ walletaddress: { $in: uniqueUserAddresses } });

        const updates = partnerActivities.map(activity => {
            const existing = teamStatistics.find(stat => stat.walletaddress == activity.walletaddress);
            if (existing) {
                if (!existing.adminchangestatus || (existing.adminchangestatus && existing.rank < activity.rank)) {
                    return Teamstatistic.findOneAndUpdate(
                        { walletaddress: activity.walletaddress },
                        { rank: activity.rank, adminchangestatus: false },
                        { useFindAndModify: false }
                    );
                }
            } else {
                return new Teamstatistic(activity).save();
            }
        });

        await Promise.all(updates);
        return res.status(200).send({ status: true, message: "User  data updates successfully" });
    } catch (error) {
        console.log(error)
        return res.status(500).json({ status: false, error: 'Internal Server Error' });
    }
}


async function getUserRankup(address) {
    const teamStatisticData = await Teamstatistic.findOne({ walletaddress: address });
    const teamSaleVolume = teamStatisticData ? teamStatisticData.teamsale : 0;
    const adminChangeStatus = teamStatisticData?.adminchangestatus || false;
    const currentRank = teamStatisticData?.rank || 0;

    for (let nftLevel = 7; nftLevel >= 1; nftLevel--) {
        const [hasNft, thresholdData] = await Promise.all([
            CheckHoldNft(address, nftLevel),
            getThreshold(nftLevel)
        ]);

        if (!hasNft || teamSaleVolume < thresholdData) continue;

        const requiredAmount = await getRequiredAmount(nftLevel - 1);
        const rankUplifted = nftLevel === 1 || await getRankUplifting(address, nftLevel - 1, requiredAmount);

        if (adminChangeStatus && ((nftLevel === 1 && currentRank > nftLevel) || (nftLevel !== 1 && currentRank < nftLevel))) {
            return currentRank;
        }
        
        if (rankUplifted) {
            return nftLevel;
        }
    }

    return 0;
}



async function CheckHoldNft(address, nftLevel) {
    const exists = await Mintnft.exists({ useraddress: address, level:{$gte:nftLevel}});
    return !!exists;
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
            if (requiredAmount == 25000) {
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
                    if (await verifyReferralRanks(member, nftLevel - 1)) {
                    memberRankCount++;
                    isSatisfied = true;
                    }
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



async function verifyReferralRanks(user, requiredRank) {
    const ReferralData = await Referral.find({ sponsoraddress: user });
    let rankAchievers = 0;

    for (let i = 0; i < ReferralData.length; i++) {
        const member = ReferralData[i].myaddress;
        const TeamstatisticData = await Teamstatistic.findOne({ walletaddress: member });
        const memberRank = TeamstatisticData?.rank || 0;

        if (memberRank == requiredRank) {
            rankAchievers++;
        }

        if (rankAchievers >= 3) {
            return true;
        }
    }

    return false;
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
                maxDepth: 300  
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

exports.StoreTeamstatistics= async (req, res) => {
    try {
        const uniqueUserAddresses = await Mintnft.find({
            useraddress: { $exists: true, $ne: null, $ne: "" }
        }).distinct("useraddress");

        const partnerActivities = await Promise.all(uniqueUserAddresses.map(async (userAddress) => {
            const [
                totalPartners,
                teamSale,
                teamSaleLastWeek,
                teamSalePreviousWeek,
                ownNft
            ] = await Promise.all([
                getTotalPartners(userAddress),
                getTeamSaleVolume(userAddress),
                getTeamSaleVolumeThisWeek(userAddress),
                getTeamSaleVolumeLastWeek(userAddress),
                Mintnft.findOne({ useraddress: userAddress }).sort({ level: -1 })
            ]);

            const NftData = ownNft ? await Nft.findOne({ level: ownNft.level }) : null;

            return {
                walletaddress: userAddress,
                ownnft: NftData ? NftData.nft : null,
                totalpartners: totalPartners.toString() || "0",
                teamsale: teamSale.toString() || "0",
                teamsalelastweek: teamSaleLastWeek.toString() || "0",
                teamsaleprivousweek: teamSalePreviousWeek.toString() || "0",
                adminchangestatus: false
            };
        }));

        const bulkOps = partnerActivities.map(activity => ({
            updateOne: {
                filter: { walletaddress: activity.walletaddress },
                update: { $set: activity },
                upsert: true
            }
        }));

        await Teamstatistic.bulkWrite(bulkOps, { ordered: false });

        return res.status(200).send({ status: true, message: "User  data updates successfully" });

    } catch (error) {
        console.error('Error occurred at line:', error.stack);
        return res.status(500).json({ status: false, error: 'Internal Server Error' });
    }
};


async function getTotalPartners(address) {
    try {
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
                    as: 'totalPartners',
                    maxDepth: 300
                }
            },
            {
                $project: {
                    totalPartnersCount: { $size: '$totalPartners' }
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
                        $add: ['$totalPartners', '$directPartners']
                    }
                }
            }
        ]);

        return result.length > 0 ? result[0].totalPartnersCount : 0;

    } catch (err) {
        throw new Error(err.message || "Internal server error while getting total partners.");
    }
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
                maxDepth: 300 
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
                maxDepth: 300  
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


exports.getTeamstatistics = (req, res) => {
    Teamstatistic.find()
        .then(data => {
            res.send({ status: true, message: "Get All List Of Team statistics", data: data });
        })
        .catch(err => {
            res.status(500).send({
                message:
                    err.message || "Some error occurred while retrieving Team statistics."
            });
        });
};

exports.getDirectTeamstatisticslatestfirst= async (req, res) => {
    const address = req.params.address;
    try {
        const referrerresult = await Referral.aggregate([
            {
                $match: { sponsoraddress: address }
            },
            {
                $lookup: {
                    from: 'teamstatistics',
                    localField: 'myaddress',
                    foreignField: 'walletaddress',
                    as: 'teamStatistics'
                }
            },
            {
                $unwind: {
                    path: '$teamStatistics',
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $sort: { 'teamStatistics.updatedAt': -1 } 
            },
            {
                $group: {
                    _id: '$myaddress',
                    latestTeamStatistic: { $first: '$teamStatistics' }
                }
            },
            {
                $group: {
                    _id: null,
                    data: { $push: '$latestTeamStatistic' }
                }
            },
            {
                $project: {
                    _id: 0,
                    data: 1
                }
            }
        ]);

        if (referrerresult.length > 0) {
            const AllData = referrerresult[0].data;
            res.send({ status: true, message: "Successfully retrieved team statistics", data: AllData });
        } else {
            res.status(404).send({
                message: "No referrals found for the given address."
            });
        }
    } catch (err) {
        res.status(500).send({
            message: err.message || "An error occurred while retrieving team statistics."
        });
    }
};

exports.updateTeamstatistics = (req, res) => {
	
    const userAddress = req.params.userAddress;
    if (!req.body) {
      return res.status(400).send({
        message: "Data to update can not be empty!"
      });
    }

    const Partneractivity ={
        "ownnft":req.body.ownnft,
        "totalpartners":req.body.totalpartners,
        "rank":req.body.rank,
        "teamsale":req.body.teamsale,
        "teamsalelastweek":req.body.teamsalelastweek,
        "adminchangestatus":req.body.adminchangestatus
    }

    Teamstatistic.findOneAndUpdate({ walletaddress: userAddress }, Partneractivity)
      .then(data => {
        clearStoreTeamstatistics(userAddress);
        if (!data) {
          res.status(404).send({
            message: `Cannot update Team statistics with id=${id}. Maybe Team statistics was not found!`
          });
        } else res.send({ message: "Team statistics was updated successfully." });
      })
      .catch(err => {
        res.status(500).send({
          message: "Error updating Team statistics with id=" + id
        });
      });
};



async function userRankBonuses(user) {

    let referrer = await Referral.findOne({ myaddress:user });
    let referrerCount = 0;
    while (referrer != null) {
        referrerCount++;
        referrer = await Referral.findOne({ myaddress:referrer.sponsoraddress });
    }
    let addressArray = [];
    let bonusArray = [];
 
    referrer = await Referral.findOne({ myaddress:user });
    const existsData = await Teamstatistic.findOne({walletaddress:referrer.sponsoraddress});
    const userRank = existsData?existsData.rank:0;
    let index = 0;
    let previousRank = 0;
    for (let i = 0; i < referrerCount; i++) {
        const getrank = await Teamstatistic.findOne({walletaddress:referrer.sponsoraddress});
        const rank = getrank?getrank.rank:0;
        if (rank >= userRank && rank > previousRank) {
            const bonusPercentage = (rank - previousRank) * 4;
            const sponsoraddress = referrer.sponsoraddress;
            addressArray.push(sponsoraddress);
            bonusArray.push(bonusPercentage);
            
            index++;
            previousRank = rank;
        }
        referrer = await Referral.findOne({ myaddress:referrer.sponsoraddress });
    }
    const finalAddressRanks = 
    {
        address : addressArray.slice(0, index),
        bonus : bonusArray.slice(0, index),
    }
    
    return finalAddressRanks; 
 }
 
//  exports.getUserRankBonuses = async (req, res) => {
//     try {
//         const { address, amount, sponsoraddress } = req.params;
//         const RankBonuses = await UserRankDistribution(address, amount, sponsoraddress);
//         res.send({ status: true, message: "Get User Rank Bonuses", RankBonuses });
//     } catch (error) {
//         res.status(500).send({
//             message: error.message || "Some error occurred while retrieving User Rank Bonuses."
//         });
//     }
// };

// async function UserRankDistribution(user, nftAmount, sponsoraddress) {
//     let currentReferrer = await Referral.findOne({ myaddress: sponsoraddress });

//     if (!currentReferrer) {
//         throw new Error("Sponsor address is invalid or not found.");
//     }

//     const addressArray = [];
//     const rankArray = [];
//     let previousRank = 0;

//     while (currentReferrer) {
//         const referrerAddress = currentReferrer.myaddress;

//         // Calculate team sales including the new investment
//         const teamSaleVolume = await getTeamSaleVolume(referrerAddress);
//         const totalTeamSale = teamSaleVolume + nftAmount;

//         // Get current rank eligibility
//         const currentRank = await getUserRankup(referrerAddress, totalTeamSale);

//         // Check if this referrer qualifies for a higher rank
//         if (currentRank > previousRank) {
//             addressArray.push(referrerAddress);
//             rankArray.push(currentRank);
//             previousRank = currentRank;
//         }

//         // Move to the next sponsor in the hierarchy
//         currentReferrer = await Referral.findOne({ myaddress: currentReferrer.sponsoraddress });
//     }

//     // Return all qualified addresses with their ranks
//     return {
//         address: addressArray,
//         rank: rankArray
//     };
// }


exports.getUserRankBonuses = async (req, res) => {
    try {
        const { address, amount, sponsoraddress } = req.params;
        const existedData=await Referral.findOne({ myaddress:address });
        if(existedData?.sponsoraddress=='0x0000000000000000000000000000000000000000'){
            const RankBonuses = await UserRankDistribution(address, amount, sponsoraddress);
            res.send({ status: true, message: "appus Get User Rank Bonuses", RankBonuses });
    
        }else{
            const RankBonuses = await userRankBonuses(address);
            res.send({status:true,message:"Get User Rank Bonuses",RankBonuses:RankBonuses});
        }
       
    } catch (error) {
        res.status(500).send({
            message: error.message || "Some error occurred while retrieving User Rank Bonuses."
        });
    }
};



async function userRankBonuses(user) {
    try {
        let referrer = await Referral.findOne({ myaddress: user });
        if (!referrer) {
            return { address: [], bonus: [] }; // No referrer case.
        }

        const addressArray = [];
        const bonusArray = [];
        const userStatistic = await Teamstatistic.findOne({ walletaddress: user });
        const userRank = userStatistic ? userStatistic.rank : 0;

        let previousRank = 0;

        while (referrer) {
            const sponsorAddress = referrer.sponsoraddress;
            const sponsorStatistic = await Teamstatistic.findOne({ walletaddress: sponsorAddress });
            const sponsorRank = sponsorStatistic ? sponsorStatistic.rank : 0;

            if (sponsorRank >= userRank && sponsorRank > previousRank) {
                const bonusPercentage = (sponsorRank - previousRank) * 4;
                addressArray.push(sponsorAddress);
                bonusArray.push(bonusPercentage);
                previousRank = sponsorRank;
            }

            referrer = await Referral.findOne({ myaddress: sponsorAddress });
      referrer = await Referral.findOne({ myaddress: sponsorAddress });
        }

        return {
            address: addressArray,
            bonus: bonusArray,
        };
    } catch (error) {
        console.error("Error calculating user rank bonuses:", error);
        throw error;
    }
}


async function UserRankDistribution(user, nftAmount, sponsoraddress) {
    let currentReferrer = await Referral.findOne({ myaddress: sponsoraddress });

    if (!currentReferrer) {
        throw new Error("Sponsor address is invalid or not found.");
    }

    const addressArray = [];
    const rankArray = [];
    let previousRank = 0;

    while (currentReferrer) {
        const referrerAddress = currentReferrer.myaddress;

        // Fetch existing team sale volume and add the new amount
        const teamSaleVolume = await getTeamSaleVolume(referrerAddress);
        const totalTeamSale = teamSaleVolume + nftAmount;

        // Add an extra team partner count of 1 (imaginary for calculation purposes)
        const teamPartnerCount = (await getTeamPartnerCount(referrerAddress)) + 1;

        // Get current rank eligibility with adjusted values
        const currentRank = await getUserRankBonousup(referrerAddress, totalTeamSale, teamPartnerCount);

        // Check if this referrer qualifies for a higher rank
        if (currentRank > previousRank) {
            addressArray.push(referrerAddress);
            rankArray.push(currentRank);
            previousRank = currentRank;
        }

        // Move to the next sponsor in the hierarchy
        currentReferrer = await Referral.findOne({ myaddress: currentReferrer.sponsoraddress });
    }

    // Return all qualified addresses with their ranks
    return {
        address: addressArray,
        rank: rankArray
    };
}

async function getUserRankBonousup(address, totalTeamSale, teamPartnerCount) {
    const teamStatisticData = await Teamstatistic.findOne({ walletaddress: address });
    const existingTeamSaleVolume = teamStatisticData ? teamStatisticData.teamsale : 0;
    const adjustedTeamSaleVolume = existingTeamSaleVolume + totalTeamSale;
    const adminChangeStatus = teamStatisticData?.adminchangestatus || false;
    const currentRank = teamStatisticData?.rank || 0;

    for (let nftLevel = 7; nftLevel >= 1; nftLevel--) {
        const [hasNft, thresholdData] = await Promise.all([
            CheckHoldNft(address, nftLevel),
            getThreshold(nftLevel)
        ]);

        if (!hasNft || adjustedTeamSaleVolume < thresholdData) continue;

        const requiredAmount = await getRequiredAmount(nftLevel - 1);
        const rankUplifted = nftLevel === 1 || await getRankBonousUplifting(address, nftLevel - 1, requiredAmount, teamPartnerCount);

        if (adminChangeStatus && ((nftLevel === 1 && currentRank > nftLevel) || (nftLevel !== 1 && currentRank < nftLevel))) {
            return currentRank;
        }

        if (rankUplifted) {
            return nftLevel;
        }
    }

    return 0;
}

async function getRankBonousUplifting(user, nftLevel, requiredAmount, teamPartnerCount) {
    const ReferralData = await Referral.find({ sponsoraddress: user });
    let memberRankCount = teamPartnerCount; // Include the imaginary team partner count

    const promises = ReferralData.map(async (referral) => {
        const member = referral.myaddress;
        const [TeamstatisticData, MintnftData, TeamSale] = await Promise.all([
            Teamstatistic.findOne({ walletaddress: member }),
            CheckHoldNft(member, nftLevel),
            getTeamSaleVolume(member)
        ]);

        const adminchangestatus = TeamstatisticData?.adminchangestatus || false;
        const teamstatisticrank = TeamstatisticData?.rank || 0;

        if (adminchangestatus && teamstatisticrank >= nftLevel) {
            memberRankCount++;
        } else if (MintnftData && teamstatisticrank >= nftLevel && TeamSale >= requiredAmount) {
            memberRankCount++;
        }

        if (memberRankCount >= 3) {
            return true;
        }

        return false;
    });

    const results = await Promise.all(promises);
    return results.includes(true);
}

async function getTeamPartnerCount(address) {
    const partners = await Referral.find({ sponsoraddress: address });
    return partners.length;
}


async function getThreshold(nftLevel) {
    const thresholds = [25000, 75000, 225000, 675000, 2025000, 6075000, 18225000];
    return thresholds[nftLevel - 1] || 0;
}


async function getRequiredAmount(nftLevel) {
    const amounts = [25000, 75000, 225000, 675000, 2025000, 6075000];
    return amounts[nftLevel - 1] || 0;
}



exports.getUserRank = async(req, res) => {
    try{
        const address = req.params.address;
        const UserRank= await Teamstatistic.find({walletaddress:address});
        res.send({status:true,message:"Get User Rank",UserRank:UserRank});
    }
    catch(error){
       res.status(500).send({
        message:
        error.message || "Some error occurred while retrieving get User Rank."
        });
    }
    
};


exports.getGraphToken = async (req, res) => {
    try {
        const currentTime = new Date();

        const result = [];
        
        for (let i = 0; i < 24; i++) {
            const startTime = new Date(currentTime.getTime() - ((24 - i) * 60 * 60 * 1000));
            const endTime = new Date(currentTime.getTime() - ((23 - i) * 60 * 60 * 1000));
            const MintnftData = await Mintnft.aggregate([
                {
                    $match: {
                        createdAt: { $gte: startTime, $lt: endTime }
                    }
                },
                {
                    $group: {
                        _id: null,
                        mintpriceSum: { $sum: "$mintprice" }
                    }
                }
            ]);
            result.push({
                hour: startTime.getHours(),
                mintpriceSum: MintnftData.length > 0 ? MintnftData[0].mintpriceSum : 0
            });
        }

        result.sort((a, b) => a.hour - b.hour);

        res.send({ status: true, message: "Get Graph Data", GraphData: result });
    } catch (error) {
        res.status(500).send({
            message: error.message || "Some error occurred while retrieving graph."
        });
    }
};

exports.getGraphTokenweekly = async (req, res) => {
    try {
        const result = [];
        const interval = 1;
        const currentTime = new Date();

        for (let i = 0; i < 7; i += interval) {
            const currentDate = new Date(currentTime.getTime() - (i * 24 * 60 * 60 * 1000));
            const currentDateStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate(), 0, 0, 0);
            const nextDate = new Date(currentDateStart.getTime() + (24 * 60 * 60 * 1000 * interval));

            const MintnftData = await Mintnft.aggregate([
                {
                    $match: {
                        createdAt: { $gte: currentDateStart, $lt: nextDate }
                    }
                },
                {
                    $group: {
                        _id: null,
                        mintpriceSum: { $sum: "$mintprice" }
                    }
                }
            ]);

            const formattedDate = currentDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
            result.push({
                date: formattedDate,
                mintpriceSum: MintnftData.length > 0 ? MintnftData[0].mintpriceSum : 0
            });
        }

        res.send({ status: true, message: "Get Graph Data", GraphData: result });
    } catch (error) {
        res.status(500).send({
            message: error.message || "Some error occurred while retrieving graph."
        });
    }
};


exports.getGraphTokenmonthly = async (req, res) => {
    try {
        const result = [];
        const interval = 1;
        const currentTime = new Date();

        for (let i = 0; i < 30; i += interval) {
            const currentDate = new Date(currentTime.getTime() - (i * 24 * 60 * 60 * 1000));
            const currentDateStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate(), 0, 0, 0);
            const nextDate = new Date(currentDateStart.getTime() + (24 * 60 * 60 * 1000 * interval));

            const MintnftData = await Mintnft.aggregate([
                {
                    $match: {
                        createdAt: { $gte: currentDateStart, $lt: nextDate }
                    }
                },
                {
                    $group: {
                        _id: null,
                        mintpriceSum: { $sum: "$mintprice" }
                    }
                }
            ]);

            const formattedDate = currentDateStart.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
            result.push({
                date: formattedDate,
                mintpriceSum: MintnftData.length > 0 ? MintnftData[0].mintpriceSum : 0
            });
        }

        res.send({ status: true, message: "Get Graph Data", GraphData: result });
    } catch (error) {
        res.status(500).send({
            message: error.message || "Some error occurred while retrieving graph."
        });
    }
};


exports.getGraphTokenSixMonths = async (req, res) => {
    try {
        const result = [];
        const interval = 15;
        const currentTime = new Date();
        const sixMonthsAgo = new Date(currentTime);
        sixMonthsAgo.setMonth(currentTime.getMonth() - 6);

        for (let i = sixMonthsAgo; i < currentTime; i.setDate(i.getDate() + interval)) {
            const currentDateStart = new Date(i.getFullYear(), i.getMonth(), i.getDate(), 0, 0, 0);
            const nextDate = new Date(currentDateStart);
            nextDate.setDate(nextDate.getDate() + interval);

            const MintnftData = await Mintnft.aggregate([
                {
                    $match: {
                        createdAt: { $gte: currentDateStart, $lt: nextDate }
                    }
                },
                {
                    $group: {
                        _id: null,
                        mintpriceSum: { $sum: "$mintprice" }
                    }
                }
            ]);

            const formattedStartDate = currentDateStart.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
            const formattedEndDate = nextDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
            result.push({
                startDate: formattedStartDate,
                endDate: formattedEndDate,
                mintpriceSum: MintnftData.length > 0 ? MintnftData[0].mintpriceSum : 0
            });
        }

        res.send({ status: true, message: "Get Graph Data", GraphData: result });
    } catch (error) {
        res.status(500).send({
            message: error.message || "Some error occurred while retrieving graph."
        });
    }
};

exports.getGraphTokenOneYear = async (req, res) => {
    try {
        const result = [];
        const currentTime = new Date();
        const oneYearAgo = new Date(currentTime);
        oneYearAgo.setFullYear(currentTime.getFullYear() - 1);

        for (let i = oneYearAgo; i <= currentTime; i.setMonth(i.getMonth() + 1)) {
            const startOfMonth = new Date(i.getFullYear(), i.getMonth(), 1, 0, 0, 0);
            const endOfMonth = new Date(i.getFullYear(), i.getMonth() + 1, 0, 23, 59, 59);

            const MintnftData = await Mintnft.aggregate([
                {
                    $match: {
                        createdAt: { $gte: startOfMonth, $lte: endOfMonth }
                    }
                },
                {
                    $group: {
                        _id: null,
                        mintpriceSum: { $sum: "$mintprice" }
                    }
                }
            ]);

            const formattedDate = startOfMonth.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
            result.push({
                date: formattedDate,
                mintpriceSum: MintnftData.length > 0 ? MintnftData[0].mintpriceSum : 0
            });
        }

        res.send({ status: true, message: "Get Graph Data", GraphData: result });
    } catch (error) {
        res.status(500).send({
            message: error.message || "Some error occurred while retrieving graph."
        });
    }
};


exports.getUserGraphToken = async (req, res) => {
    try {
        const useraddress = req.params.address;
        const timeZone = 'Asia/Kolkata';
        const currentTime = new Date(new Date().toLocaleString('en-US', { timeZone }));

        const resultPromises = Array.from({ length: 13 }, (_, i) => {
            const endTime = new Date(currentTime);
            endTime.setHours(endTime.getHours() - (24 - i * 2));
            endTime.setMinutes(0);
            endTime.setSeconds(0);

            const startTime = new Date(endTime);
            startTime.setHours(startTime.getHours() - 2);

            const startTimeISO = new Date(startTime.getTime() - startTime.getTimezoneOffset() * 60000).toISOString().replace('Z', '+00:00');
            const endTimeISO = new Date(endTime.getTime() - endTime.getTimezoneOffset() * 60000).toISOString().replace('Z', '+00:00');

            return Mintnft.aggregate([
                {
                    $match: {
                        useraddress: useraddress
                    }
                },
                {
                    $graphLookup: {
                        from: "mintnfts",
                        startWith: "$useraddress",
                        connectFromField: "useraddress",
                        connectToField: "referreraddress",
                        as: "allReferrals",
                        maxDepth: 10
                    }
                },
                {
                    $project: {
                        allReferrals: {
                            $filter: {
                                input: "$allReferrals",
                                as: "referral",
                                cond: {
                                    $and: [
                                        { $gte: ["$$referral.createdAt", new Date(startTimeISO)] },
                                        { $lt: ["$$referral.createdAt", new Date(endTimeISO)] }
                                    ]
                                }
                            }
                        }
                    }
                },
                {
                    $unwind: "$allReferrals"
                },
                {
                    $group: {
                        _id: null,
                        mintpriceSum: { $sum: "$allReferrals.mintprice" }
                    }
                },
                {
                    $project: {
                        _id: 0,
                        mintpriceSum: 1
                    }
                }
            ]).then(MintnftData => [
                startTime.getTime(),
                MintnftData.length > 0 ? MintnftData[0].mintpriceSum : 0
            ]);
        });

        Promise.all(resultPromises)
            .then(result => {
                result.sort((a, b) => a[0] - b[0]);
                res.send({ status: true, message: "Get Graph Data", GraphData: result });
            })
            .catch(error => {
                res.status(500).send({ status: false, message: error.message });
            });
    } catch (error) {
        res.status(500).send({
            message: error.message || "Some error occurred while retrieving graph."
        });
    }
};


exports.getUserGraphTokenweekly = async (req, res) => {
    try {
        const useraddress = req.params.address;
        const currentTime = new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });
        const startDate = new Date(currentTime);
    
        startDate.setUTCHours(0, 0, 0, 0);
        
        const dateRanges = [];
        for (let i = 0; i < 7; i++) {
            const start = new Date(startDate);
            start.setUTCDate(startDate.getUTCDate() - (6 - i));
            const end = new Date(start);
            end.setUTCDate(start.getUTCDate() + 1);
            dateRanges.push({ start, end });
        }
        
        const getMintPriceSum = async (range) => {
           
            const MintnftData = await Mintnft.aggregate([
                {
                    $match: {
                        useraddress: useraddress 
                    }
                },
                {
                    $graphLookup: {
                        from: "mintnfts",       
                        startWith: "$useraddress", 
                        connectFromField: "useraddress", 
                        connectToField: "referreraddress", 
                        as: "allReferrals", 
                        maxDepth: 10 
                    }
                },
                {
                    $project: {
                        allReferrals: {
                            $filter: {
                                input: "$allReferrals",
                                as: "referral",
                                cond: {
                                    $and: [
                                        { $gte: ["$$referral.createdAt",range.start] },
                                        { $lt: ["$$referral.createdAt", range.end] }
                                    ]
                                }
                            }
                        }
                    }
                },
                {
                    $unwind: "$allReferrals"
                },
                {
                    $group: {
                        _id: null,
                        mintpriceSum: { $sum: "$allReferrals.mintprice" }
                    }
                },
                {
                    $project: {
                        _id: 0,
                        mintpriceSum: 1
                    }
                }
            ]);
            
            return {
                date:range.start.getTime(),
                Mintprice: MintnftData.length > 0 ? MintnftData[0].mintpriceSum : 0
            };
        };
        
        const results = await Promise.all(dateRanges.map(range => getMintPriceSum(range)));
        
        const result = results.map(res => [res.date, res.Mintprice]);

        res.send({ status: true, message: "Get Graph Data", GraphData: result });
    } catch (error) {
        res.status(500).send({
            message: error.message || "Some error occurred while retrieving graph."
        });
    }
};

exports.getUserGraphTokenmonthly = async (req, res) => {
    try {
        const useraddress = req.params.address;
        const currentDate = new Date();
        const endDate = new Date(Date.UTC(currentDate.getUTCFullYear(), currentDate.getUTCMonth(), currentDate.getUTCDate(), 23, 59, 59, 999));
        
        const startDate = new Date(Date.UTC(currentDate.getUTCFullYear(), currentDate.getUTCMonth() - 1, currentDate.getUTCDate()));
        
        const getMintPriceSum = async (start, end) => {
            const MintnftData = await Mintnft.aggregate([
                {
                    $match: {
                        useraddress: useraddress 
                    }
                },
                {
                    $graphLookup: {
                        from: "mintnfts", 
                        startWith: "$useraddress",
                        connectFromField: "useraddress", 
                        connectToField: "referreraddress",
                        as: "allReferrals",  
                        maxDepth: 10  
                    }
                },
                {
                    $project: {
                        allReferrals: {
                            $filter: {
                                input: "$allReferrals",
                                as: "referral",
                                cond: {
                                    $and: [
                                        { $gte: ["$$referral.createdAt", start] },
                                        { $lt: ["$$referral.createdAt", end] }
                                    ]
                                }
                            }
                        }
                    }
                },
                {
                    $unwind: "$allReferrals"
                },
                {
                    $group: {
                        _id: null,
                        mintpriceSum: { $sum: "$allReferrals.mintprice" }
                    }
                },
                {
                    $project: {
                        _id: 0,
                        mintpriceSum: 1
                    }
                }
            ]);
            
           
            
            return {
                date: start.getTime(),
                Mintprice: MintnftData.length > 0 ? MintnftData[0].mintpriceSum : 0
            };
        };

        const dailyData = [];
        let currentDay = new Date(endDate);
        
        while (currentDay >= startDate) {
            const nextDay = new Date(currentDay);
            nextDay.setUTCDate(currentDay.getUTCDate() - 2);
        
            const result = await getMintPriceSum(nextDay, currentDay);
            dailyData.push([result.date, result.Mintprice]);
        
            currentDay = nextDay;
        }
        
        res.send({ status: true, message: "Get Graph Data", GraphData: dailyData });
    } catch (error) {
        res.status(500).send({
            message: error.message || "Some error occurred while retrieving graph."
        });
    }
};


exports.getUserGraphTokenSixMonths = async (req, res) => {
    try {
       
        const useraddress = req.params.address;
        const result = [];
        const currentTime = new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });
        const currentDate = new Date(currentTime);

        currentDate.setMonth(currentDate.getMonth() - 6);

        while (currentDate <= new Date()) {
            const startDate = new Date(currentDate);
            const endDate = new Date(startDate);
            endDate.setDate(endDate.getDate() + 15);

            const today = new Date();
            if (endDate > today) {
                endDate.setTime(today.getTime());
            }

            const MintnftData = await Mintnft.aggregate([
                {
                    $match: {
                        useraddress: useraddress 
                    }
                },
                {
                    $graphLookup: {
                        from: "mintnfts",  
                        startWith: "$useraddress",
                        connectFromField: "useraddress",
                        connectToField: "referreraddress",
                        as: "allReferrals", 
                        maxDepth: 10 
                    }
                },
                {
                    $project: {
                        allReferrals: {
                            $filter: {
                                input: "$allReferrals",
                                as: "referral",
                                cond: {
                                    $and: [
                                        { $gte: ["$$referral.createdAt", startDate] },
                                        { $lt: ["$$referral.createdAt", endDate] }
                                    ]
                                }
                            }
                        }
                    }
                },
                {
                    $unwind: "$allReferrals"
                },
                {
                    $group: {
                        _id: null,
                        mintpriceSum: { $sum: "$allReferrals.mintprice" }
                    }
                },
                {
                    $project: {
                        _id: 0,
                        mintpriceSum: 1
                    }
                }
            ]);
            
            result.push([
                startDate.getTime(),
                MintnftData.length > 0 ? MintnftData[0].mintpriceSum : 0
            ]);
            currentDate.setDate(currentDate.getDate() + 15);
        }
        res.send({ status: true, message: "Get Graph Data", GraphData: result });
    
    } catch (error) {
        res.status(500).send({
            message: error.message || "Some error occurred while retrieving graph."
        });
    }
};

exports.getUserGraphTokenOneYear = async (req, res) => {
    try {
        const useraddress = req.params.address;
        const timeZone = 'Asia/Kolkata';

        const currentTime = new Date(new Date().toLocaleString('en-US', { timeZone }));
        
        const result = [];
        let currentDate = new Date(currentTime);

        for (let i = 0; i < 12; i++) {
            const startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
            const endDate = new Date(startDate);
            endDate.setMonth(startDate.getMonth() + 1);
            const mintNftData = await Mintnft.aggregate([
                {
                    $match: {
                        useraddress: useraddress
                    }
                },
                {
                    $graphLookup: {
                        from: "mintnfts",
                        startWith: "$useraddress",
                        connectFromField: "useraddress",
                        connectToField: "referreraddress",
                        as: "allReferrals",
                        maxDepth: 10
                    }
                },
                {
                    $project: {
                        allReferrals: {
                            $filter: {
                                input: "$allReferrals",
                                as: "referral",
                                cond: {
                                    $and: [
                                        { $gte: ["$$referral.createdAt", startDate] },
                                        { $lt: ["$$referral.createdAt", endDate] }
                                    ]
                                }
                            }
                        }
                    }
                },
                {
                    $unwind: "$allReferrals"
                },
                {
                    $group: {
                        _id: null,
                        mintpriceSum: { $sum: "$allReferrals.mintprice" }
                    }
                },
                {
                    $project: {
                        _id: 0,
                        mintpriceSum: 1
                    }
                }
            ]);

            const mintpriceSum = mintNftData.length > 0 ? mintNftData[0].mintpriceSum : 0;

            result.push([
                startDate.getTime(),
                mintpriceSum
            ]);

            currentDate.setMonth(currentDate.getMonth() - 1);
        }

        res.send({ status: true, message: "Get Graph Data", GraphData: result });
    } catch (error) {
        res.status(500).send({
            message: error.message || "Some error occurred while retrieving graph."
        });
    }
};

exports.getUserGraphTeamTurnoverHourly = async (req, res) => {
    try {
        const useraddress= req.params.address;
        const hourlyData = [];
        const currentTime = new Date();

        const endTime = new Date(currentTime);
        const startTime = new Date(endTime.getTime() - 24 * 60 * 60 * 1000);

        const teamTurnoverData = await getTeamTurnoverHourly(startTime, endTime, useraddress);
        console.log(teamTurnoverData);
        for (const entry of teamTurnoverData) {
            const dateObj = parseStringToDate(entry._id);
            const formattedDate = dateObj.toLocaleDateString('en-IN', {
                day: '2-digit',
                month: 'short',
                hour: 'numeric',
                minute: '2-digit'
            });
   
            hourlyData.push({
                date: formattedDate,
                totalInvestment: entry.mintpriceSum
            });
        }

        res.send({ status: true, message: "Get User Graph Data", GraphData: hourlyData });
    } catch (error) {
        res.status(500).send({
            message: error.message || "Some error occurred while retrieving graph data."
        });
    }
};


async function getTeamTurnoverHourly(startTime, endTime, useraddress) {
    const result = await Mintnft.aggregate([
        {
            $match: {
                createdAt: { $gte: startTime, $lt: endTime },
                useraddress: useraddress
            }
        },
        {
            $group: {
                _id: { 
                    $dateToString: { 
                        format: "%Y-%m-%d %H", 
                        date: "$createdAt", 
                        timezone: "Asia/Kolkata" 
                    } 
                },
                mintpriceSum: { $sum: "$mintprice" }
            }
        },
        {
            $sort: { "_id": 1 }
        }
    ]);

    return result;
}

exports.getUserGraphTeamTurnoverWeekly = async (req, res) => {
    try {
        const { address } = req.params;
        const weeklyData = [];
        const currentTime = new Date();

        const startDate = new Date(currentTime.getTime() - 7 * 24 * 60 * 60 * 1000);
        startDate.setHours(0, 0, 0, 0);


        for (let i = 0; i < 7; i++) {
            const endDate = new Date(startDate);
            endDate.setHours(23, 59, 59, 999);

            const formattedDate = startDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });

            const teamTurnover = await getTeamTurnoverDaily(startDate,endDate, address);
            weeklyData.push({
                date: formattedDate,
                totalInvestment: teamTurnover
            });

            startDate.setDate(startDate.getDate() + 1);
        }

        res.send({ status: true, message: "Get User Graph Data", GraphData: weeklyData });
    } catch (error) {
        res.status(500).send({
            message: error.message || "Some error occurred while retrieving graph data."
        });
    }
};



async function getTeamTurnoverDaily(startDate, endDate, useraddress) {
    const teamMembers = await Referral.find({ sponsoraddress: useraddress }).select('myaddress');
    const teamMemberAddresses = teamMembers.map(member => member.myaddress);

    if (teamMemberAddresses.length === 0) {
        return 0;
    }

    const startDateStr = formatDate(startDate);
    const endDateStr = formatDate(endDate);

    const MintnftData = await Mintnft.aggregate([
        {
            $match: {
                createdAt: { $gte: new Date(startDateStr), $lte: new Date(endDateStr) },
                useraddress: { $in: teamMemberAddresses }
            }
        },
        {
            $group: {
                _id: null,
                mintpriceSum: { $sum: "$mintprice" }
            }
        }
    ]);

    const totalInvestment = MintnftData.length > 0 ? MintnftData[0].mintpriceSum : 0;
    return totalInvestment;
}


exports.getUserGraphTeamTurnoverMonthly = async (req, res) => {
    try {
        const useraddress = req.params.address;
        const monthlyData = [];
        const currentTime = new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });
        
        let startDate = new Date(currentTime);
        startDate.setDate(1);
        startDate.setHours(0, 0, 0, 0);
        
        const endDate = new Date(startDate);
        endDate.setMonth(endDate.getMonth() - 1);
        endDate.setDate(0); 
        
        const teamMembers = await Referral.find({ sponsoraddress: useraddress }).select('myaddress');
        const teamMemberAddresses = teamMembers.map(member => member.myaddress);
        
        if (teamMemberAddresses.length === 0) {
            return res.send({ status: true, message: "No team members found", GraphData: monthlyData });
        }
        
        const startDateISO = startDate.toISOString();
        const endDateISO = endDate.toISOString();
        
        const result = await Mintnft.aggregate([
            {
                $match: {
                    createdAt: { $gte: new Date(startDateISO), $lt: new Date(endDateISO) },
                    useraddress: { $in: teamMemberAddresses }
                }
            },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: "Asia/Kolkata" } },
                    totalInvestment: { $sum: "$mintprice" }
                }
            },
            {
                $sort: { _id: 1 }
            }
        ]);
      
        result.forEach(entry => {
            const formattedDate = new Date(entry._id).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
            monthlyData.push({
                date: formattedDate,
                totalInvestment: entry.totalInvestment
            });
        });
        
        res.send({ status: true, message: "Get User Graph Data", GraphData: monthlyData });
    
    } catch (error) {
        res.status(500).send({
            message: error.message || "Some error occurred while retrieving graph data."
        });
    }
};


exports.getUserGraphTeamTurnoverSixMonths = async (req, res) => {
    try {
        const { useraddress } = req.params.address;
        const sixMonthsData = [];
        const currentTime = new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });

        let startDate = new Date(currentTime);
        startDate.setDate(1);
        startDate.setHours(0, 0, 0, 0);

        const endDate = new Date(startDate);
        endDate.setMonth(endDate.getMonth() - 6);
        endDate.setDate(0);

        while (startDate <= endDate) {
            const formattedDate = startDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });

            const teamTurnover = await getTeamTurnoverSixMonths(startDate, useraddress);
            sixMonthsData.push({
                date: formattedDate,
                totalInvestment: teamTurnover
            });

            startDate.setDate(startDate.getDate() + 15);
        }

        res.send({ status: true, message: "Get User Graph Data", GraphData: sixMonthsData });
    } catch (error) {
        res.status(500).send({
            message: error.message || "Some error occurred while retrieving graph data."
        });
    }
};


async function getTeamTurnoverSixMonths(date, useraddress) {
    const startTime = new Date(date);
    startTime.setHours(0, 0, 0, 0);
    
    const endTime = new Date(startTime);
    endTime.setDate(endTime.getDate() - 15);

    const teamMembers = await Referral.find({ sponsoraddress: useraddress });
    let totalInvestment = 0;

    for (const member of teamMembers) {
        const MintnftData = await Mintnft.aggregate([
            {
                $match: {
                    createdAt: { $gte: startTime, $lt: endTime },
                    useraddress: member.myaddress
                }
            },
            {
                $group: {
                    _id: null,
                    mintpriceSum: { $sum: "$mintprice" }
                }
            }
        ]);
        
        totalInvestment += MintnftData.length > 0 ? MintnftData[0].mintpriceSum : 0;

        const memberInvestment = await getTeamTurnoverSixMonths(date, member.myaddress);
        totalInvestment += memberInvestment;
    }

    return totalInvestment;
}


exports.getUserGraphTeamTurnoverYearly = async (req, res) => {
    try {
        const { useraddress } = req.params.address;
        const yearlyData = [];
        const currentTime = new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });

        let startDate = new Date(currentTime);
        startDate.setDate(1);
        startDate.setHours(0, 0, 0, 0);

        const endDate = new Date(startDate);
        endDate.setFullYear(endDate.getFullYear() - 1);
        endDate.setDate(0);

        while (startDate <= endDate) {
            const formattedDate = startDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });

            const teamTurnover = await getTeamTurnoveryear(startDate, useraddress);
            yearlyData.push({
                date: formattedDate,
                totalInvestment: teamTurnover
            });

            startDate.setMonth(startDate.getMonth() - 1);
        }

        res.send({ status: true, message: "Get User Graph Data", GraphData: yearlyData });
    } catch (error) {
        res.status(500).send({
            message: error.message || "Some error occurred while retrieving graph data."
        });
    }
};



async function getTeamTurnoveryear(date, useraddress) {
    const startTime = new Date(date);
    startTime.setHours(0, 0, 0, 0);
    
    const endTime = new Date(startTime);
    endTime.setMonth(endTime.getMonth() - 1);

    const teamMembers = await Referral.find({ sponsoraddress: useraddress });
    let totalInvestment = 0;

    for (const member of teamMembers) {
        const MintnftData = await Mintnft.aggregate([
            {
                $match: {
                    createdAt: { $gte: startTime, $lt: endTime },
                    useraddress: member.myaddress
                }
            },
            {
                $group: {
                    _id: null,
                    mintpriceSum: { $sum: "$mintprice" }
                }
            }
        ]);
        
        totalInvestment += MintnftData.length > 0 ? MintnftData[0].mintpriceSum : 0;

        const memberInvestment = await getTeamTurnoveryear(date, member.myaddress);
        totalInvestment += memberInvestment;
    }

    return totalInvestment;
}







exports.GetUserNewRankBonous=async(req,res)=>{
    const {amount,sponsorID}=req.params;
    try{
        const RankBonuses = await UserRankDistributions(amount, sponsorID);
        res.send({ status: true, message: "appus Get User Rank Bonuses", RankBonuses });
    }catch(error){
        return res.status(500).json({error:"Internal server error"});
    }
}


async function UserRankDistributions(nftAmount, sponsoraddress) {
    let currentReferrer = await Referral.findOne({ myaddress:sponsoraddress});

    if (!currentReferrer) {
        throw new Error("Sponsor address is invalid or not found.");
    }

    const addressArray = [];
    const rankArray = [];
    let previousRank = 0;

    while (currentReferrer) {
        const referrerAddress = currentReferrer.myaddress;

        // Fetch existing team sale volume and add the new amount
        const teamSaleVolume = await getTeamSaleVolume(referrerAddress);
        const totalTeamSale = teamSaleVolume + nftAmount;

        // Add an extra team partner count of 1 (imaginary for calculation purposes)
        const teamPartnerCount = (await getTeamPartnerCount(referrerAddress)) + 1;

        // Get current rank eligibility with adjusted values
        const currentRank = await getUserRankBonousups(referrerAddress, totalTeamSale, teamPartnerCount);
              console.log("appus testing ",currentRank,  "address",referrerAddress)
        // Check if this referrer qualifies for a higher rank
        if (currentRank > previousRank) {
            addressArray.push(referrerAddress);
            rankArray.push(currentRank);
            //rankArray.push(4);
            previousRank = currentRank;
        }

        // Move to the next sponsor in the hierarchy
        currentReferrer = await Referral.findOne({ myaddress: currentReferrer.sponsoraddress });
    }

    // Return all qualified addresses with their ranks
    return {
        address: addressArray,
        rank: rankArray
    };
}


async function getUserRankBonousups(address, totalTeamSale, teamPartnerCount) {
    const teamStatisticData = await Teamstatistic.findOne({ walletaddress: address });
    const existingTeamSaleVolume = teamStatisticData ? teamStatisticData.teamsale : 0;
    const adjustedTeamSaleVolume = existingTeamSaleVolume + totalTeamSale;
    const adminChangeStatus = teamStatisticData?.adminchangestatus || false;
    const currentRank = teamStatisticData?.rank || 0;

    for (let nftLevel = 7; nftLevel >= 1; nftLevel--) {
        const [hasNft, thresholdData] = await Promise.all([
            CheckHoldNft(address, nftLevel),
            getThreshold(nftLevel)
        ]);

        if (!hasNft || adjustedTeamSaleVolume < thresholdData) continue;

        const requiredAmount = await getRequiredAmount(nftLevel - 1);
        const rankUplifted = nftLevel === 1 || await getRankBonousUpliftings(address, nftLevel - 1, requiredAmount, teamPartnerCount);

        if (adminChangeStatus && ((nftLevel === 1 && currentRank > nftLevel) || (nftLevel !== 1 && currentRank < nftLevel))) {
            return currentRank;
        }

        if (rankUplifted) {
            return nftLevel;
        }
    }

    return 0;
}

async function getRankBonousUpliftings(user, nftLevel, requiredAmount, teamPartnerCount) {
    const ReferralData = await Referral.find({ sponsoraddress: user });
    let memberRankCount = teamPartnerCount; // Include the imaginary team partner count

    const promises = ReferralData.map(async (referral) => {
        const member = referral.myaddress;
        const [TeamstatisticData, MintnftData, TeamSale] = await Promise.all([
            Teamstatistic.findOne({ walletaddress: member }),
            CheckHoldNft(member, nftLevel),
            getTeamSaleVolume(member)
        ]);

        const adminchangestatus = TeamstatisticData?.adminchangestatus || false;
        const teamstatisticrank = TeamstatisticData?.rank || 0;

        if (adminchangestatus && teamstatisticrank >= nftLevel) {
            memberRankCount++;
        } else if (MintnftData && teamstatisticrank >= nftLevel && TeamSale >= requiredAmount) {
            memberRankCount++;
        }

        if (memberRankCount >= 3) {
            return true;
        }

        return false;
    });

    const results = await Promise.all(promises);
    return results.includes(true);
}


exports.GetNewRankBonous = async (req, res) => {
    const { amount, sponsorID } = req.params;
    try {
        // Step 1: Retrieve the referral hierarchy
        let Address = await Referral.findOne({ myaddress: sponsorID });
        let AllAddress = [];
        while (Address) {
            const referrerAddress = Address.myaddress;
            AllAddress.push(referrerAddress);
            Address = await Referral.findOne({ myaddress: Address.sponsoraddress });
        }
        // Step 2: Retrieve team statistics for all addresses
        let result = [];
        for (let i = 0; i < AllAddress.length; i++) {
            const data = await Teamstatistic.findOne({ walletaddress: AllAddress[i] });
            if (data) {
                result.push(data);
            }
        }

        // Step 3: Define rank conditions
        const rankConditions = [
            { rank: 1, minTeamSale: 25000, minTotalPartners: 1, nftlevel: 1, referal_rank: 0 },
            { rank: 2, minTeamSale: 75000, minTotalPartners: 3, nftlevel: 2, referal_rank: 1 },
            { rank: 3, minTeamSale: 225000, minTotalPartners: 3, nftlevel: 3, referal_rank: 2 },
            { rank: 4, minTeamSale: 675000, minTotalPartners: 3, nftlevel: 4, referal_rank: 3 },
            { rank: 5, minTeamSale: 2025000, minTotalPartners: 3, nftlevel: 5, referal_rank: 4 },
            { rank: 6, minTeamSale: 6075000, minTotalPartners: 3, nftlevel: 6, referal_rank: 5 },
        ];

        // Step 4: Process ranks and check uplifting
        let Uplifting = [];
        for (let j = 0; j < result.length; j++) {
            const currentData = result[j];
            let currentRank = currentData.rank;
            const newTeamSale = currentData.teamsale + Number(amount);
            const currentPartner = j === 0 ? currentData.totalpartners + 1 : currentData.totalpartners;

            for (const condition of rankConditions) {
                if (
                    newTeamSale >= condition.minTeamSale &&
                    currentPartner >= condition.minTotalPartners &&
                    currentRank < condition.rank &&
                    await Mintnft.findOne({ useraddress: currentData.walletaddress, level: { $gte: condition.nftlevel } }) &&
                    await Referal_Rank(currentData.walletaddress, condition.minTotalPartners, condition.referal_rank)
                ) {
                    currentRank = condition.rank;
                }
            }

            // Update rank if there's a change
            // if (currentRank !== currentData.rank) {
            //     await Teamstatistic.updateOne(
            //         { walletaddress: currentData.walletaddress },
            //         { $set: { rank: currentRank } }
            //     );
            // }

            Uplifting.push({
                walletaddress: currentData.walletaddress,
                oldRank: currentData.rank,
                newRank: currentRank,
            });
        }
       let previousBonous=0;
       let previousRank=0;
       let address=[];
       let bonus=[];
        for(let j=0;j<Uplifting.length;j++){
           let currentRank=Uplifting[j]?.newRank;
             if(previousRank<currentRank){
                address.push(Uplifting[j].walletaddress);
                if(previousRank+1==Uplifting[j].newRank){
                    bonus.push(4);
                }else{
                    let skip=Uplifting[j].newRank-previousRank;
                    bonus.push(4*skip);
                } 
                // if(previousRank<currentRank){
                //     let diff=Uplifting[j]?.newRank-previousRank;
                //     bonus.push(diff*4);
                // }else{
                //     bonus.push(4);
                // }
             }
             previousBonous=Uplifting[j]?.newRank
                previousRank=Uplifting[j]?.newRank;
        }
   return res.status(200).send({
        "status": true,
        "message": "Get User Rank Bonuses",
        "RankBonuses": {
            address,
            bonus
        }
      })
        
    } catch (error) {
        return res.status(500).json({ error: "Internal server error" });
    }
};

async function Referal_Rank(address, TeamCount, referalRank) {
    try {
        const TeamMembers = await Referral.find({ sponsoraddress: address });
        let rankCount = 0;

        for (let i = 0; i < TeamMembers.length; i++) {
            const teamRank = await Teamstatistic.findOne({ walletaddress: TeamMembers[i].myaddress });
            if (teamRank?.rank === referalRank) {
                rankCount++;
            }
        }

        return rankCount >= TeamCount;
    } catch (error) {
        return false;
    }
}
