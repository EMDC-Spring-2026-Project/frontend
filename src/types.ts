export type ClusterType = 'preliminary' | 'championship' | 'redesign';

export interface Cluster {
  id: number;
  cluster_name: string;
  cluster_type?: ClusterType;
}

/**
 * Cluster with additional fields returned from API.
 * Extends base Cluster with contest_id and sheet_flags.
 */
export interface ClusterWithContest extends Cluster {
  contest_id?: number;
  sheet_flags?: {
    presentation?: boolean;
    journal?: boolean;
    mdo?: boolean;
    runpenalties?: boolean;
    otherpenalties?: boolean;
    redesign?: boolean;
    championship?: boolean;
  };
}

/**
 * Question configuration for score sheets.
 * Used for presentation, journal, and machine design questions.
 * Some questions use Junior/Senior specific criteria instead of generic criteria1/2/3.
 */
export interface Question {
  id: number;
  field: string;
  questionText: string;
  criteria1?: string;
  criteria1Points?: string;
  criteria2?: string;
  criteria2Points?: string;
  criteria3?: string;
  criteria3Points?: string;
  lowPoints: number;
  highPoints: number;
  criteria1Junior?: string;
  criteria1Senior?: string;
  criteria2Junior?: string;
  criteria2Senior?: string;
  criteria3Junior?: string;
  criteria3Senior?: string;
}

export interface ClusterTeamMapping {
  id: number;
  clusterid: number;
  teamid: number;
}

export interface Coach {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
}

export interface Contest {
  id: number;
  name: string;
  date: string;
  is_open: boolean;
  is_tabulated: boolean;
}

export interface Organizer {
  id: number;
  first_name: string;
  last_name: string;
  username: string;
  password: string;
}

export interface NewContest {
  name: string;
  date: string;
  is_open: boolean;
  is_tabulated: boolean;
}

export interface EditedTeam {
  id: number;
  team_name: string;
  school_name: string;
  clusterid: number;
  username: string;
  first_name: string;
  last_name: string;
  contestid: number;
}

export interface EditedJudge {
  id: number;
  first_name: string;
  last_name: string;
  phone_number: string;
  presentation: boolean;
  mdo: boolean;
  journal: boolean;
  runpenalties: boolean;
  otherpenalties: boolean;
  clusterid: number;
  username: string;
  role: number;
}

export interface Judge {
  id: number;
  first_name: string;
  last_name: string;
  phone_number: string;
  role: number;
  presentation: boolean;
  redesign:boolean;
  championship:boolean;
  mdo: boolean;
  journal: boolean;
  runpenalties: boolean;
  otherpenalties: boolean;
}

export interface JudgeData {
  id: number;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  cluster: Cluster;
  role: number;
  journalSS: boolean;
  presSS: boolean;
  mdoSS: boolean;
  runPenSS: boolean;
  genPenSS: boolean;
  redesignSS: boolean;
  championshipSS: boolean;
}

export interface MapContestToJudge {
  id: number;
  contestid: number;
  judgeid: number;
}

export interface NewJudge {
  first_name: string;
  last_name: string;
  phone_number: string;
  presentation: boolean;
  mdo: boolean;
  journal: boolean;
  runpenalties: boolean;
  otherpenalties: boolean;
  username: string;
  password: string;
  contestid: number;
  clusterid?: number;
  clusterids?: any[];
  role: number;
}

export interface NewTeam {
  team_name: string;
  school_name: string;
  journal_score: number;
  presentation_score: number;
  machinedesign_score: number;
  redesign_score: number;
  championship_score: number;
  penalties_score: number;
  total_score: number;
  clusterid: number;
  username: string;
  password: string;
  first_name: string;
  last_name: string;
  contestid: number;
}

export interface OrganizerRow {
  id: number;
  first_name: string;
  last_name: string;
  editButton: any;
  deleteButton: any;
  assignContest: any;
}

export interface Role {
  user_type: number;
  user: {
    id: number;
    first_name: string;
    last_name: string;
    presentation: boolean;
    mdo: boolean;
    journal: boolean;
    penalties: boolean;
  };
}

export interface ScoreSheet {
  teamId: number;
  id: number;
  sheetType?: number;
  judgeId?: number;
  isSubmitted?: boolean;
  field1: number | string;
  field2: number | string;
  field3: number | string;
  field4: number | string;
  field5: number | string;
  field6: number | string;
  field7: number | string;
  field8: number | string;
  field9?: number | string;
  field10?: number | string;
  field11?: number | string;
  field12?: number | string;
  field13?: number | string;
  field14?: number | string;
  field15?: number | string;
  field16?: number | string;
  field17?: number | string;
  field18?: number | string;
  field19?: number | string;
  field20?: number | string;
  field21?: number | string;
  field22?: number | string;
  field23?: number | string;
  field24?: number | string;
  field25?: number | string;
  field26?: number | string;
  field27?: number | string;
  field28?: number | string;
  field29?: number | string;
  field30?: number | string;
  field31?: number | string;
  field32?: number | string;
  field33?: number | string;
  field34?: number | string;
  field35?: number | string;
}

export interface ScoreSheetMapping {
  id: number;
  judgeid: number;
  teamid: number;
  sheetType: number;
  scoresheetid: number;
}

export interface ScoreSheetMappingWithSheet {
  mapping: {
    judgeid: number;
    teamid: number;
    scoresheetid: number;
    sheetType: number;
  };
  scoresheet: ScoreSheet | null;
  total: number | null;
}

export interface Team {
  id: number;
  team_name: string;
  school_name: string;
  journal_score: number;
  presentation_score: number;
  machinedesign_score: number;
  penalties_score: number;
  judge_cluster?: number;
  total_score: number;
  team_rank: number | null;
  judge_disqualified: boolean;
  organizer_disqualified: boolean;
  advanced_to_championship?: boolean;
  // Championship fields
  championship_score?: number;
  championship_total_score?: number;
  championship_rank?: number;
  // Redesign fields
  redesign_score?: number;
  redesign_total_score?: number;
  redesign_rank?: number;
}

export interface TeamData {
  id: number;
  team_name: string;
  school_name: string;
  clusterid: number;
  username: string;
  first_name: string;
  last_name: string;
  contestid: number;
}

export interface User {
  id: number;
  username: string;
  password: string;
}

export interface UserRoleMapping {
  uuid: string;
  role: number;
  relatedid: number;
}

export enum ScoreSheetType {
  Presentation = 1,
  Journal = 2,
  MachineDesign = 3,
  RunPenalties = 4,
  GeneralPenalties = 5,
  Redesign = 6,
  Championship = 7
}

export enum PresentationScoreSheetFields {
  field1 = 1,
  field2 = 2,
  field3 = 3,
  field4 = 4,
  field5 = 5,
  field6 = 6,
  field7 = 7,
  field8 = 8,
  Comments = 9,
}

export enum JournalScoreSheetFields {
  field1 = 1,
  field2 = 2,
  field3 = 3,
  field4 = 4,
  field5 = 5,
  field6 = 6,
  field7 = 7,
  field8 = 8,
  Comments = 9,
}

export enum MachineDesignScoreSheetFields {
  field1 = 1,
  field2 = 2,
  field3 = 3,
  field4 = 4,
  field5 = 5,
  field6 = 6,
  field7 = 7,
  field8 = 8,
  Comments = 9,
}

export enum RunPenaltiesScoreSheetFields {
  field1 = 1,
  field2 = 2,
  field3 = 3,
  field4 = 4,
  field5 = 5,
  field6 = 6,
  field7 = 7,
  field8 = 8,
  field10 = 10,
  field11 = 11,
  field12 = 12,
  field13 = 13,
  field14 = 14,
  field15 = 15,
  field16 = 16,
  field17 = 17,
}

export enum GeneralPenaltiesScoreSheetFields {
  field1 = 1,
  field2 = 2,
  field3 = 3,
  field4 = 4,
  field5 = 5,
  field6 = 6,
  field7 = 7,
}

export enum RedesignScoreSheetFields {
  field1 = 1,
  field2 = 2,
  field3 = 3,
  field4 = 4,
  field5 = 5,
  field6 = 6,
  field7 = 7,
  field8 = 8,
}

export enum ChampionshipScoreSheetFields {
  // Machine Design fields 1-8
  field1 = 1,
  field2 = 2,
  field3 = 3,
  field4 = 4,
  field5 = 5,
  field6 = 6,
  field7 = 7,
  field8 = 8,
  // Machine Design comment field 9
  field9 = 9,
  // Presentation fields 10-17
  field10 = 10,
  field11 = 11,
  field12 = 12,
  field13 = 13,
  field14 = 14,
  field15 = 15,
  field16 = 16,
  field17 = 17,
  // Presentation comment field 18
  field18 = 18,
  // Penalty fields 19-42
  field19 = 19,
  field20 = 20,
  field21 = 21,
  field22 = 22,
  field23 = 23,
  field24 = 24,
  field25 = 25,
  field26 = 26,
  field27 = 27,
  field28 = 28,
  field29 = 29,
  field30 = 30,
  field31 = 31,
  field32 = 32,
  field33 = 33,
  field34 = 34,
  field35 = 35,
  field36 = 36,
  field37 = 37,
  field38 = 38,
  field39 = 39,
  field40 = 40,
  field41 = 41,
  field42 = 42,
}

export type ScoreSheetDetails = {
  [ScoreSheetType.Presentation]: PresentationScoreSheetDetails;
  [ScoreSheetType.Journal]: JournalScoreSheetDetails;
  [ScoreSheetType.MachineDesign]: MachineDesignScoreSheetDetails;
  [ScoreSheetType.RunPenalties]: RunPenaltiesScoreSheetDetails;
  [ScoreSheetType.GeneralPenalties]: GeneralPenaltiesScoreSheetDetails;
  [ScoreSheetType.Redesign]: RedesignScoreSheetDetails;
  [ScoreSheetType.Championship]: ChampionshipScoreSheetDetails;
} | null;

export type PresentationScoreSheetDetails = {
  [PresentationScoreSheetFields.field1]: number[];
  [PresentationScoreSheetFields.field2]: number[];
  [PresentationScoreSheetFields.field3]: number[];
  [PresentationScoreSheetFields.field4]: number[];
  [PresentationScoreSheetFields.field5]: number[];
  [PresentationScoreSheetFields.field6]: number[];
  [PresentationScoreSheetFields.field7]: number[];
  [PresentationScoreSheetFields.field8]: number[];
  [PresentationScoreSheetFields.Comments]: string[];
};

export type JournalScoreSheetDetails = {
  [JournalScoreSheetFields.field1]: number[];
  [JournalScoreSheetFields.field2]: number[];
  [JournalScoreSheetFields.field3]: number[];
  [JournalScoreSheetFields.field4]: number[];
  [JournalScoreSheetFields.field5]: number[];
  [JournalScoreSheetFields.field6]: number[];
  [JournalScoreSheetFields.field7]: number[];
  [JournalScoreSheetFields.field8]: number[];
  [JournalScoreSheetFields.Comments]: string[];
};

export interface MachineDesignScoreSheetDetails {
  [MachineDesignScoreSheetFields.field1]: number[];
  [MachineDesignScoreSheetFields.field2]: number[];
  [MachineDesignScoreSheetFields.field3]: number[];
  [MachineDesignScoreSheetFields.field4]: number[];
  [MachineDesignScoreSheetFields.field5]: number[];
  [MachineDesignScoreSheetFields.field6]: number[];
  [MachineDesignScoreSheetFields.field7]: number[];
  [MachineDesignScoreSheetFields.field8]: number[];
  [MachineDesignScoreSheetFields.Comments]: string[];
}

export interface RunPenaltiesScoreSheetDetails {
  [RunPenaltiesScoreSheetFields.field1]: any[];
  [RunPenaltiesScoreSheetFields.field2]: any[];
  [RunPenaltiesScoreSheetFields.field3]: any[];
  [RunPenaltiesScoreSheetFields.field4]: any[];
  [RunPenaltiesScoreSheetFields.field5]: any[];
  [RunPenaltiesScoreSheetFields.field6]: any[];
  [RunPenaltiesScoreSheetFields.field7]: any[];
  [RunPenaltiesScoreSheetFields.field8]: any[];
  [RunPenaltiesScoreSheetFields.field10]: any[];
  [RunPenaltiesScoreSheetFields.field11]: any[];
  [RunPenaltiesScoreSheetFields.field12]: any[];
  [RunPenaltiesScoreSheetFields.field13]: any[];
  [RunPenaltiesScoreSheetFields.field14]: any[];
  [RunPenaltiesScoreSheetFields.field15]: any[];
  [RunPenaltiesScoreSheetFields.field16]: any[];
  [RunPenaltiesScoreSheetFields.field17]: any[];
}

export interface GeneralPenaltiesScoreSheetDetails {
  [GeneralPenaltiesScoreSheetFields.field1]: any[];
  [GeneralPenaltiesScoreSheetFields.field2]: any[];
  [GeneralPenaltiesScoreSheetFields.field3]: any[];
  [GeneralPenaltiesScoreSheetFields.field4]: any[];
  [GeneralPenaltiesScoreSheetFields.field5]: any[];
  [GeneralPenaltiesScoreSheetFields.field6]: any[];
  [GeneralPenaltiesScoreSheetFields.field7]: any[];
}

export interface RedesignScoreSheetDetails {
  [RedesignScoreSheetFields.field1]: number[];
  [RedesignScoreSheetFields.field2]: number[];
  [RedesignScoreSheetFields.field3]: number[];
  [RedesignScoreSheetFields.field4]: number[];
  [RedesignScoreSheetFields.field5]: number[];
  [RedesignScoreSheetFields.field6]: number[];
  [RedesignScoreSheetFields.field7]: number[];
  [RedesignScoreSheetFields.field8]: string[];
}

export interface ChampionshipScoreSheetDetails {
  // Machine Design fields 1-8
  [ChampionshipScoreSheetFields.field1]: number[];
  [ChampionshipScoreSheetFields.field2]: number[];
  [ChampionshipScoreSheetFields.field3]: number[];
  [ChampionshipScoreSheetFields.field4]: number[];
  [ChampionshipScoreSheetFields.field5]: number[];
  [ChampionshipScoreSheetFields.field6]: number[];
  [ChampionshipScoreSheetFields.field7]: number[];
  [ChampionshipScoreSheetFields.field8]: number[];
  // Machine Design comment field 9
  [ChampionshipScoreSheetFields.field9]: string[];
  // Presentation fields 10-17
  [ChampionshipScoreSheetFields.field10]: number[];
  [ChampionshipScoreSheetFields.field11]: number[];
  [ChampionshipScoreSheetFields.field12]: number[];
  [ChampionshipScoreSheetFields.field13]: number[];
  [ChampionshipScoreSheetFields.field14]: number[];
  [ChampionshipScoreSheetFields.field15]: number[];
  [ChampionshipScoreSheetFields.field16]: number[];
  [ChampionshipScoreSheetFields.field17]: number[];
  // Presentation comment field 18
  [ChampionshipScoreSheetFields.field18]: string[];
  // Penalty fields 19-42
  [ChampionshipScoreSheetFields.field19]: number[];
  [ChampionshipScoreSheetFields.field20]: number[];
  [ChampionshipScoreSheetFields.field21]: number[];
  [ChampionshipScoreSheetFields.field22]: number[];
  [ChampionshipScoreSheetFields.field23]: number[];
  [ChampionshipScoreSheetFields.field24]: number[];
  [ChampionshipScoreSheetFields.field25]: number[];
  [ChampionshipScoreSheetFields.field26]: number[];
  [ChampionshipScoreSheetFields.field27]: number[];
  [ChampionshipScoreSheetFields.field28]: number[];
  [ChampionshipScoreSheetFields.field29]: number[];
  [ChampionshipScoreSheetFields.field30]: number[];
  [ChampionshipScoreSheetFields.field31]: number[];
  [ChampionshipScoreSheetFields.field32]: number[];
  [ChampionshipScoreSheetFields.field33]: number[];
  [ChampionshipScoreSheetFields.field34]: number[];
  [ChampionshipScoreSheetFields.field35]: number[];
  [ChampionshipScoreSheetFields.field36]: number[];
  [ChampionshipScoreSheetFields.field37]: number[];
  [ChampionshipScoreSheetFields.field38]: number[];
  [ChampionshipScoreSheetFields.field39]: number[];
  [ChampionshipScoreSheetFields.field40]: number[];
  [ChampionshipScoreSheetFields.field41]: number[];
  [ChampionshipScoreSheetFields.field42]: number[];
}