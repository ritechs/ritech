import { relations } from "drizzle-orm";
import { account, session, user } from "./auth.js";
import {
  conferenceAwards,
  conferenceCommittee,
  conferenceDates,
  conferenceFees,
  conferenceSpeakers,
  conferenceSponsors,
  conferenceTracks,
  conferences,
  eventSpeakers,
  events,
  expertise,
  galleryAlbums,
  galleryItems,
  mailGroupMembers,
  mailGroups,
  media,
  memberExpertise,
  memberProfiles,
  newsPosts,
  organisations,
  registrations,
  speakers,
  sponsorshipPackages,
} from "./app.js";

export const userRelations = relations(user, ({ one, many }) => ({
  profile: one(memberProfiles, { fields: [user.id], references: [memberProfiles.userId] }),
  sessions: many(session),
  accounts: many(account),
}));
export const sessionRelations = relations(session, ({ one }) => ({ user: one(user, { fields: [session.userId], references: [user.id] }) }));
export const accountRelations = relations(account, ({ one }) => ({ user: one(user, { fields: [account.userId], references: [user.id] }) }));

export const memberProfileRelations = relations(memberProfiles, ({ one, many }) => ({
  user: one(user, { fields: [memberProfiles.userId], references: [user.id] }),
  photo: one(media, { fields: [memberProfiles.photoId], references: [media.id] }),
  expertise: many(memberExpertise),
}));
export const memberExpertiseRelations = relations(memberExpertise, ({ one }) => ({
  member: one(memberProfiles, { fields: [memberExpertise.userId], references: [memberProfiles.userId] }),
  expertise: one(expertise, { fields: [memberExpertise.expertiseId], references: [expertise.id] }),
}));

export const conferenceRelations = relations(conferences, ({ one, many }) => ({
  cover: one(media, { fields: [conferences.coverId], references: [media.id] }),
  tracks: many(conferenceTracks),
  dates: many(conferenceDates),
  fees: many(conferenceFees),
  committee: many(conferenceCommittee),
  awards: many(conferenceAwards),
  sponsorship: many(sponsorshipPackages),
  speakers: many(conferenceSpeakers),
  sponsors: many(conferenceSponsors),
}));
export const conferenceTrackRelations = relations(conferenceTracks, ({ one }) => ({ conference: one(conferences, { fields: [conferenceTracks.conferenceId], references: [conferences.id] }) }));
export const conferenceDateRelations = relations(conferenceDates, ({ one }) => ({ conference: one(conferences, { fields: [conferenceDates.conferenceId], references: [conferences.id] }) }));
export const conferenceFeeRelations = relations(conferenceFees, ({ one }) => ({ conference: one(conferences, { fields: [conferenceFees.conferenceId], references: [conferences.id] }) }));
export const conferenceCommitteeRelations = relations(conferenceCommittee, ({ one }) => ({ conference: one(conferences, { fields: [conferenceCommittee.conferenceId], references: [conferences.id] }) }));
export const conferenceAwardRelations = relations(conferenceAwards, ({ one }) => ({ conference: one(conferences, { fields: [conferenceAwards.conferenceId], references: [conferences.id] }) }));
export const sponsorshipPackageRelations = relations(sponsorshipPackages, ({ one }) => ({ conference: one(conferences, { fields: [sponsorshipPackages.conferenceId], references: [conferences.id] }) }));
export const conferenceSpeakerRelations = relations(conferenceSpeakers, ({ one }) => ({
  conference: one(conferences, { fields: [conferenceSpeakers.conferenceId], references: [conferences.id] }),
  speaker: one(speakers, { fields: [conferenceSpeakers.speakerId], references: [speakers.id] }),
}));
export const conferenceSponsorRelations = relations(conferenceSponsors, ({ one }) => ({
  conference: one(conferences, { fields: [conferenceSponsors.conferenceId], references: [conferences.id] }),
  organisation: one(organisations, { fields: [conferenceSponsors.organisationId], references: [organisations.id] }),
}));

export const speakerRelations = relations(speakers, ({ one }) => ({ photo: one(media, { fields: [speakers.photoId], references: [media.id] }) }));
export const organisationRelations = relations(organisations, ({ one }) => ({ logo: one(media, { fields: [organisations.logoId], references: [media.id] }) }));

export const eventRelations = relations(events, ({ one, many }) => ({
  cover: one(media, { fields: [events.coverId], references: [media.id] }),
  speakers: many(eventSpeakers),
  registrations: many(registrations),
}));
export const eventSpeakerRelations = relations(eventSpeakers, ({ one }) => ({
  event: one(events, { fields: [eventSpeakers.eventId], references: [events.id] }),
  speaker: one(speakers, { fields: [eventSpeakers.speakerId], references: [speakers.id] }),
}));
export const registrationRelations = relations(registrations, ({ one }) => ({
  event: one(events, { fields: [registrations.eventId], references: [events.id] }),
  conference: one(conferences, { fields: [registrations.conferenceId], references: [conferences.id] }),
}));

export const newsPostRelations = relations(newsPosts, ({ one }) => ({ cover: one(media, { fields: [newsPosts.coverId], references: [media.id] }) }));
export const galleryAlbumRelations = relations(galleryAlbums, ({ many }) => ({ items: many(galleryItems) }));
export const galleryItemRelations = relations(galleryItems, ({ one }) => ({
  album: one(galleryAlbums, { fields: [galleryItems.albumId], references: [galleryAlbums.id] }),
  media: one(media, { fields: [galleryItems.mediaId], references: [media.id] }),
}));
export const mailGroupRelations = relations(mailGroups, ({ many }) => ({ members: many(mailGroupMembers) }));
export const mailGroupMemberRelations = relations(mailGroupMembers, ({ one }) => ({ group: one(mailGroups, { fields: [mailGroupMembers.groupId], references: [mailGroups.id] }) }));
