import type { Complaint, ComplaintFormData } from '@/types/complaint';

const STOP_WORDS = ['的', '了', '是', '在', '我', '有', '和', '就', '不', '人', '都', '一', '一个', '上', '也', '很', '到', '说', '要', '去', '你', '会', '着', '没有', '看', '好', '自己', '这'];

function extractKeywords(text: string): string[] {
  const cleanText = text.replace(/[，。！？、；：""''（）\s,.!?;:'"()【】[\]]/g, '');
  const keywords: string[] = [];
  
  for (let len = 2; len <= Math.min(4, cleanText.length); len++) {
    for (let i = 0; i <= cleanText.length - len; i++) {
      const word = cleanText.substring(i, i + len);
      if (!STOP_WORDS.includes(word) && word.trim().length > 0) {
        keywords.push(word);
      }
    }
  }
  
  const singleChars = cleanText.split('').filter(c => !STOP_WORDS.includes(c) && c.trim());
  keywords.push(...singleChars);
  
  return [...new Set(keywords)];
}

function calculateContentSimilarity(content1: string, content2: string): number {
  const keywords1 = extractKeywords(content1);
  const keywords2 = extractKeywords(content2);
  
  if (keywords1.length === 0 || keywords2.length === 0) return 0;
  
  const set1 = new Set(keywords1);
  const set2 = new Set(keywords2);
  
  let intersection = 0;
  set1.forEach((word) => {
    if (set2.has(word)) {
      intersection++;
    }
  });
  
  const union = set1.size + set2.size - intersection;
  if (union === 0) return 0;
  
  const jaccard = intersection / union;
  
  let longMatchCount = 0;
  const longKeywords1 = keywords1.filter(k => k.length >= 3);
  const longKeywords2 = new Set(keywords2.filter(k => k.length >= 3));
  
  longKeywords1.forEach((word) => {
    if (longKeywords2.has(word)) {
      longMatchCount++;
    }
  });
  
  const longBonus = longKeywords1.length > 0 ? longMatchCount / longKeywords1.length : 0;
  
  return Math.min(1, jaccard * 0.6 + longBonus * 0.4);
}

export interface SimilarComplaint {
  complaint: Complaint;
  similarity: number;
  matchReasons: string[];
}

export function findSimilarComplaints(
  newComplaint: ComplaintFormData,
  existingComplaints: Complaint[],
  threshold: number = 0.3
): SimilarComplaint[] {
  const results: SimilarComplaint[] = [];
  
  for (const existing of existingComplaints) {
    const matchReasons: string[] = [];
    let totalScore = 0;
    let weightSum = 0;
    
    const phoneMatch = newComplaint.phone.trim() === existing.phone.trim();
    if (phoneMatch) {
      matchReasons.push('联系方式相同');
      totalScore += 0.4;
    }
    weightSum += 0.4;
    
    const typeMatch = newComplaint.type === existing.type;
    if (typeMatch) {
      matchReasons.push('诉求类型相同');
      totalScore += 0.2;
    }
    weightSum += 0.2;
    
    const contentSim = calculateContentSimilarity(newComplaint.content, existing.content);
    if (contentSim > 0.15) {
      matchReasons.push('内容关键词相似');
      totalScore += contentSim * 0.4;
    }
    weightSum += 0.4;
    
    const normalizedScore = weightSum > 0 ? totalScore / weightSum : 0;
    
    if (normalizedScore >= threshold) {
      results.push({
        complaint: existing,
        similarity: Math.round(normalizedScore * 100),
        matchReasons,
      });
    }
  }
  
  return results.sort((a, b) => b.similarity - a.similarity);
}
