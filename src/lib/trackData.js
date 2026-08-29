import provisoireQuestions from '../../data/questions.json'
import networkingQuestions from '../../data/it/networking.json'
import cybersecurityQuestions from '../../data/it/cybersecurity.json'
import helpdeskQuestions from '../../data/it/helpdesk.json'
import softwareQuestions from '../../data/it/software.json'
import cloudQuestions from '../../data/it/cloud.json'
import databasesQuestions from '../../data/it/databases.json'
import sysadminQuestions from '../../data/it/sysadmin.json'
import devopsQuestions from '../../data/it/devops.json'

export const TRACK_QUESTIONS = {
  provisoire: provisoireQuestions,
  'it-networking': networkingQuestions,
  'it-cybersecurity': cybersecurityQuestions,
  'it-helpdesk': helpdeskQuestions,
  'it-software': softwareQuestions,
  'it-cloud': cloudQuestions,
  'it-databases': databasesQuestions,
  'it-sysadmin': sysadminQuestions,
  'it-devops': devopsQuestions,
}
